import type { NotificationEvent, WebPushSubscription } from "@prisma/client";
import { z } from "zod";

export const pushSubscriptionBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  }),
  userAgent: z.string().trim().max(2000).optional(),
  deviceName: z.string().trim().max(200).optional()
});

export const deleteCurrentSubscriptionBodySchema = z.object({
  endpoint: z.string().url()
});

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value === true || value === "true";
  });

export const listNotificationsQuerySchema = z.object({
  unread: booleanQuerySchema,
  type: z.enum(["reminder"]).optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const notificationIdParamsSchema = z.object({
  notificationId: z.string().min(1)
});

export const subscriptionIdParamsSchema = z.object({
  subscriptionId: z.string().min(1)
});

export const clickedNotificationBodySchema = z
  .object({
    markAsRead: z.boolean().optional().default(true)
  })
  .optional()
  .default({ markAsRead: true });

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionBodySchema>;
export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;

export interface PushSubscriptionDto {
  id: string;
  enabled: boolean;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  todoId: string | null;
  reminderId: string | null;
  createdAt: string;
  readAt: string | null;
  deliveredAt: string | null;
  clickedAt: string | null;
  pushSentAt: string | null;
  pushFailedAt: string | null;
  pushError: string | null;
  payload: unknown;
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toPushSubscriptionDto(
  subscription: Pick<WebPushSubscription, "id" | "enabled" | "createdAt">
): PushSubscriptionDto {
  return {
    id: subscription.id,
    enabled: subscription.enabled,
    createdAt: subscription.createdAt.toISOString()
  };
}

export function toNotificationDto(event: NotificationEvent): NotificationDto {
  return {
    id: event.id,
    type: event.type,
    title: event.title,
    body: event.body,
    todoId: event.todoId,
    reminderId: event.reminderId,
    createdAt: event.createdAt.toISOString(),
    readAt: toIso(event.readAt),
    deliveredAt: toIso(event.deliveredAt),
    clickedAt: toIso(event.clickedAt),
    pushSentAt: toIso(event.pushSentAt),
    pushFailedAt: toIso(event.pushFailedAt),
    pushError: event.pushError,
    payload: event.payloadJson
  };
}
