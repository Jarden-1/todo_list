import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import type { PushSubscriptionInput } from "./notification.dto";
import { toPushSubscriptionDto } from "./notification.dto";
import { getVapidPublicKey } from "./webPushClient";

function newSubscriptionId(): string {
  return `wps_${randomUUID()}`;
}

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getPushPublicKey(): { publicKey: string } {
  return {
    publicKey: getVapidPublicKey()
  };
}

export async function savePushSubscription(
  prisma: PrismaClient,
  userId: string,
  input: PushSubscriptionInput
) {
  const now = new Date();
  const subscription = await prisma.webPushSubscription.upsert({
    where: {
      userId_endpoint: {
        userId,
        endpoint: input.endpoint
      }
    },
    create: {
      id: newSubscriptionId(),
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: optionalText(input.userAgent),
      deviceName: optionalText(input.deviceName),
      enabled: true,
      failureCount: 0,
      createdAt: now,
      updatedAt: now
    },
    update: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: optionalText(input.userAgent),
      deviceName: optionalText(input.deviceName),
      enabled: true,
      revokedAt: null,
      failureCount: 0,
      updatedAt: now
    }
  });

  return toPushSubscriptionDto(subscription);
}

export async function deletePushSubscription(
  prisma: PrismaClient,
  userId: string,
  subscriptionId: string
): Promise<boolean> {
  const now = new Date();
  const result = await prisma.webPushSubscription.updateMany({
    where: {
      id: subscriptionId,
      userId
    },
    data: {
      enabled: false,
      revokedAt: now,
      updatedAt: now
    }
  });

  return result.count > 0;
}

export async function deleteCurrentPushSubscription(
  prisma: PrismaClient,
  userId: string,
  endpoint: string
): Promise<boolean> {
  const now = new Date();
  const result = await prisma.webPushSubscription.updateMany({
    where: {
      userId,
      endpoint
    },
    data: {
      enabled: false,
      revokedAt: now,
      updatedAt: now
    }
  });

  return result.count > 0;
}
