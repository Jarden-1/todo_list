import type { FastifyPluginAsync } from "fastify";

import { dataResponse } from "../../common/http";
import { loginSchema, registerSchema } from "./auth.schemas";
import { AuthService } from "./auth.service";
import {
  clearSessionCookie,
  getSessionMeta,
  renewSessionIfNeeded,
  requireRequestSession,
  resolveRequestSession,
  revokeSession,
  revokeSessionToken,
  setSessionCookie
} from "./session.service";
import { toAuthUserDto } from "./auth.types";

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AuthService(app.prisma);

  app.addHook("onRequest", async (request) => {
    await resolveRequestSession(app.prisma, request);
  });

  app.post("/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await authService.register(body, getSessionMeta(request));

    setSessionCookie(app, reply, result.session.token, result.session.session.expiresAt);

    reply.status(201).send(
      dataResponse({
        user: toAuthUserDto(result.user, { includeCreatedAt: true })
      })
    );
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body, getSessionMeta(request));

    setSessionCookie(app, reply, result.session.token, result.session.session.expiresAt);

    return dataResponse({
      user: toAuthUserDto(result.user, { includeCreatedAt: true })
    });
  });

  app.post("/auth/logout", async (request, reply) => {
    if (request.auth?.userId && request.auth.sessionId) {
      await revokeSession(
        app.prisma,
        request.auth.userId,
        request.auth.sessionId
      );
    } else if (request.sessionToken) {
      await revokeSessionToken(app.prisma, request.sessionToken);
    }

    clearSessionCookie(app, reply);

    return dataResponse({ ok: true });
  });

  app.get("/auth/me", async (request, reply) => {
    const auth = await requireRequestSession(app.prisma, request);
    const user = await authService.getCurrentUser(auth.userId);

    // Keep an actively-used login alive: slide the expiry window forward.
    await renewSessionIfNeeded(app.prisma, app, request, reply);

    return dataResponse({
      user: toAuthUserDto(user)
    });
  });
};

export default authRoutes;
