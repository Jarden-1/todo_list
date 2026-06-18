import cookie, { type FastifyCookieOptions } from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { config } from "../config";

const sessionCookieOptions: FastifyCookieOptions["parseOptions"] = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.NODE_ENV === "production",
  path: "/"
};

async function cookieSessionPlugin(app: FastifyInstance): Promise<void> {
  await app.register(cookie, {
    secret: config.SESSION_SECRET
  });

  app.decorate("sessionCookieName", config.SESSION_COOKIE_NAME);
  app.decorate("sessionCookieOptions", sessionCookieOptions);

  app.addHook("onRequest", async (request) => {
    const rawCookie = request.cookies[config.SESSION_COOKIE_NAME];
    const parsed = rawCookie ? request.unsignCookie(rawCookie) : null;

    request.sessionToken = parsed?.valid ? parsed.value : undefined;
  });
}

export default fp(cookieSessionPlugin, {
  name: "cookie-session"
});
