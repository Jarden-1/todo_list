import type { PrismaClient } from "@prisma/client";
import type { FastifyCookieOptions } from "@fastify/cookie";
import type Redis from "ioredis";

import type { AuthContext } from "./auth";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    sessionCookieName: string;
    sessionCookieOptions: FastifyCookieOptions["parseOptions"];
  }

  interface FastifyRequest {
    auth?: AuthContext;
    sessionToken?: string;
  }
}
