import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../common/auth";
import { ApiError } from "../../common/apiError";
import { dataResponse } from "../../common/http";
import {
  deleteCurrentSubscriptionBodySchema,
  pushSubscriptionBodySchema,
  subscriptionIdParamsSchema
} from "./notification.dto";
import {
  deleteCurrentPushSubscription,
  deletePushSubscription,
  getPushPublicKey,
  savePushSubscription
} from "./push.service";

export async function pushRoutes(app: FastifyInstance): Promise<void> {
  app.get("/push/public-key", async () => {
    return dataResponse(getPushPublicKey());
  });

  app.post("/push/subscriptions", async (request, reply) => {
    const { userId } = requireAuth(request);
    const input = pushSubscriptionBodySchema.parse(request.body);
    const subscription = await savePushSubscription(app.prisma, userId, input);

    reply.status(201);
    return dataResponse({ subscription });
  });

  app.delete("/push/subscriptions/current", async (request) => {
    const { userId } = requireAuth(request);
    const input = deleteCurrentSubscriptionBodySchema.parse(request.body);
    const deleted = await deleteCurrentPushSubscription(
      app.prisma,
      userId,
      input.endpoint
    );

    if (!deleted) {
      throw new ApiError("NOT_FOUND", "Web Push subscription 不存在", 404);
    }

    return dataResponse({ ok: true });
  });

  app.delete("/push/subscriptions/:subscriptionId", async (request) => {
    const { userId } = requireAuth(request);
    const params = subscriptionIdParamsSchema.parse(request.params);
    const deleted = await deletePushSubscription(
      app.prisma,
      userId,
      params.subscriptionId
    );

    if (!deleted) {
      throw new ApiError("NOT_FOUND", "Web Push subscription 不存在", 404);
    }

    return dataResponse({ ok: true });
  });
}

export default pushRoutes;
