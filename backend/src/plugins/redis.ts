import type { FastifyInstance } from "fastify";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { config } from "../config";

export interface RedisPluginOptions {
  redis?: Redis;
}

const redisPlugin: FastifyPluginAsync<RedisPluginOptions> = async (
  app: FastifyInstance,
  options
) => {
  const redis =
    options.redis ??
    new Redis(config.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2
    });

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    if (!options.redis) {
      redis.disconnect();
    }
  });
};

export default fp(redisPlugin, {
  name: "redis"
});
