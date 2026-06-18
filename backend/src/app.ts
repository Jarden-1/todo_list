import fastify, { type FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";

import { dataResponse } from "./common/http";
import { config } from "./config";
import { aiRoutes, undoRoutes } from "./modules/ai";
import { authRoutes, authSessionPlugin } from "./modules/auth";
import filesRoutes from "./modules/files/files.routes";
import notificationModuleRoutes from "./modules/notifications";
import {
  projectsRoutes,
  tagsRoutes,
  todosRoutes
} from "./modules/todos";
import { workspaceRoutes } from "./modules/workspace";
import settingsRoutes from "./modules/settings/settings.routes";
import cookieSessionPlugin from "./plugins/cookieSession";
import errorHandlerPlugin from "./plugins/errorHandler";
import prismaPlugin from "./plugins/prisma";
import redisPlugin from "./plugins/redis";

export interface BuildAppOptions {
  prisma?: PrismaClient;
  redis?: Redis;
}

export async function buildApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const app = fastify({
    logger:
      config.NODE_ENV === "test"
        ? false
        : {
            level: config.NODE_ENV === "production" ? "info" : "debug"
          }
  });

  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin, { prisma: options.prisma });
  await app.register(redisPlugin, { redis: options.redis });
  await app.register(cookieSessionPlugin);
  await app.register(authSessionPlugin);

  app.get("/api/v1/health", async () => {
    return dataResponse({ ok: true });
  });

  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(settingsRoutes);
      await api.register(projectsRoutes);
      await api.register(tagsRoutes);
      await api.register(todosRoutes);
      await api.register(filesRoutes);
      await api.register(notificationModuleRoutes);
      await api.register(aiRoutes);
      await api.register(undoRoutes);
      await api.register(workspaceRoutes);
    },
    { prefix: "/api/v1" }
  );

  return app;
}
