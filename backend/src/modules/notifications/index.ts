import type { FastifyInstance } from "fastify";

import { notificationsRoutes } from "./notifications.routes";
import { pushRoutes } from "./push.routes";

export async function notificationModuleRoutes(
  app: FastifyInstance
): Promise<void> {
  await app.register(pushRoutes);
  await app.register(notificationsRoutes);
}

export default notificationModuleRoutes;
