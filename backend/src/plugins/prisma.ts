import { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

export interface PrismaPluginOptions {
  prisma?: PrismaClient;
}

const prismaPlugin: FastifyPluginAsync<PrismaPluginOptions> = async (
  app: FastifyInstance,
  options
) => {
  const prisma =
    options.prisma ??
    new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "warn", "error"]
          : ["warn", "error"]
    });

  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    if (!options.prisma) {
      await prisma.$disconnect();
    }
  });
};

export default fp(prismaPlugin, {
  name: "prisma"
});
