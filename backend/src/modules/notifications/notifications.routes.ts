import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../common/auth";
import { dataResponse } from "../../common/http";
import {
  clickedNotificationBodySchema,
  listNotificationsQuerySchema,
  notificationIdParamsSchema
} from "./notification.dto";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationClicked,
  markNotificationDelivered,
  markNotificationRead
} from "./notifications.service";

export async function notificationsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get("/notifications", async (request) => {
    const { userId } = requireAuth(request);
    const query = listNotificationsQuerySchema.parse(request.query);
    return listNotifications(app.prisma, userId, query);
  });

  app.post("/notifications/read-all", async (request) => {
    const { userId } = requireAuth(request);
    const result = await markAllNotificationsRead(app.prisma, userId);
    return dataResponse(result);
  });

  app.post("/notifications/:notificationId/read", async (request) => {
    const { userId } = requireAuth(request);
    const params = notificationIdParamsSchema.parse(request.params);
    const notification = await markNotificationRead(
      app.prisma,
      userId,
      params.notificationId
    );

    return dataResponse({ notification });
  });

  app.post(
    "/notifications/:notificationId/delivered",
    async (request) => {
      const { userId } = requireAuth(request);
      const params = notificationIdParamsSchema.parse(request.params);
      const notification = await markNotificationDelivered(
        app.prisma,
        userId,
        params.notificationId
      );

      return dataResponse({ notification });
    }
  );

  app.post("/notifications/:notificationId/clicked", async (request) => {
    const { userId } = requireAuth(request);
    const params = notificationIdParamsSchema.parse(request.params);
    const body = clickedNotificationBodySchema.parse(request.body);
    const notification = await markNotificationClicked(
      app.prisma,
      userId,
      params.notificationId,
      body.markAsRead
    );

    return dataResponse({ notification });
  });
}

export default notificationsRoutes;
