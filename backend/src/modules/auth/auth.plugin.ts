import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { resolveRequestSession } from "./session.service";

async function authSessionPlugin(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (request) => {
    await resolveRequestSession(app.prisma, request);
  });
}

export default fp(authSessionPlugin, {
  name: "auth-session"
});
