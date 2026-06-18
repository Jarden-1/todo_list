import type { FastifyRequest } from "fastify";

import { ApiError } from "./apiError";

export interface AuthContext {
  userId: string;
  sessionId?: string;
}

export function getAuth(request: FastifyRequest): AuthContext | null {
  return request.auth ?? null;
}

export function requireAuth(request: FastifyRequest): AuthContext {
  const auth = getAuth(request);

  if (!auth?.userId) {
    throw new ApiError("UNAUTHORIZED", "请先登录", 401);
  }

  return auth;
}
