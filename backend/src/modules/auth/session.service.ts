import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { Prisma, PrismaClient, Session } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { unauthenticatedError } from "./auth.errors";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type SessionDatabase = PrismaClient | Prisma.TransactionClient;
type CookieOptions = NonNullable<Parameters<FastifyReply["setCookie"]>[2]>;

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface CreatedSession {
  session: Session;
  token: string;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getSessionExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

export async function createSession(
  db: SessionDatabase,
  userId: string,
  meta: SessionMeta,
  now = new Date()
): Promise<CreatedSession> {
  const token = createSessionToken();
  const session = await db.session.create({
    data: {
      id: `sess_${randomUUID()}`,
      userId,
      tokenHash: hashSessionToken(token),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      createdAt: now,
      expiresAt: getSessionExpiresAt(now)
    }
  });

  return { session, token };
}

export async function resolveRequestSession(
  db: SessionDatabase,
  request: FastifyRequest
): Promise<void> {
  if (request.auth || !request.sessionToken) {
    return;
  }

  const session = await db.session.findUnique({
    where: {
      tokenHash: hashSessionToken(request.sessionToken)
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          disabledAt: true
        }
      }
    }
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.disabledAt
  ) {
    return;
  }

  request.auth = {
    userId: session.userId,
    sessionId: session.id
  };
}

export async function requireRequestSession(
  db: SessionDatabase,
  request: FastifyRequest
): Promise<{ userId: string; sessionId: string }> {
  await resolveRequestSession(db, request);

  if (!request.auth?.userId || !request.auth.sessionId) {
    throw unauthenticatedError();
  }

  return {
    userId: request.auth.userId,
    sessionId: request.auth.sessionId
  };
}

export async function revokeSession(
  db: SessionDatabase,
  userId: string,
  sessionId: string,
  now = new Date()
): Promise<void> {
  await db.session.updateMany({
    where: {
      id: sessionId,
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: now
    }
  });
}

export async function revokeSessionToken(
  db: SessionDatabase,
  token: string,
  now = new Date()
): Promise<void> {
  await db.session.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null
    },
    data: {
      revokedAt: now
    }
  });
}

function getCookieOptions(app: FastifyInstance, expiresAt?: Date): CookieOptions {
  return {
    ...(app.sessionCookieOptions as CookieOptions),
    signed: true,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    ...(expiresAt ? { expires: expiresAt } : {})
  };
}

export function setSessionCookie(
  app: FastifyInstance,
  reply: FastifyReply,
  token: string,
  expiresAt: Date
): void {
  reply.setCookie(
    app.sessionCookieName,
    token,
    getCookieOptions(app, expiresAt)
  );
}

export function clearSessionCookie(
  app: FastifyInstance,
  reply: FastifyReply
): void {
  const cookieOptions = getCookieOptions(app);

  reply.clearCookie(app.sessionCookieName, {
    path: cookieOptions.path,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure
  });
}

export function getSessionMeta(request: FastifyRequest): SessionMeta {
  const userAgentHeader = request.headers["user-agent"];

  return {
    userAgent: Array.isArray(userAgentHeader)
      ? userAgentHeader.join(" ")
      : userAgentHeader,
    ipAddress: request.ip
  };
}
