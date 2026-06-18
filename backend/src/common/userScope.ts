import { ApiError } from "./apiError";

export function scopedByUser<TWhere extends Record<string, unknown>>(
  userId: string,
  where?: TWhere
): TWhere & { userId: string } {
  return {
    ...(where ?? ({} as TWhere)),
    userId
  };
}

export function assertUserOwnsResource(
  actualUserId: string | null | undefined,
  expectedUserId: string
): void {
  if (!actualUserId || actualUserId !== expectedUserId) {
    throw new ApiError("NOT_FOUND", "资源不存在", 404);
  }
}
