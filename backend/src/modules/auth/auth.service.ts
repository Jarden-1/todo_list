import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient, type User } from "@prisma/client";

import { DEFAULT_TIMEZONE } from "../../common/constants";
import { authError, invalidCredentialsError, unauthenticatedError } from "./auth.errors";
import { hashPassword, verifyPassword } from "./password";
import {
  createSession,
  type CreatedSession,
  type SessionMeta
} from "./session.service";
import type { LoginInput, RegisterInput } from "./auth.types";

const DEFAULT_AI_ASSISTANT_PROMPT = "你是 SmartTodo 的 AI 待办助手。";

type AuthUser = Pick<
  User,
  "id" | "loginName" | "displayName" | "timezone" | "createdAt"
>;

export interface AuthResult {
  user: AuthUser;
  session: CreatedSession;
}

export function normalizeLoginName(loginName: string): string {
  return loginName.trim().toLowerCase();
}

export class AuthService {
  constructor(private readonly db: PrismaClient) {}

  async register(input: RegisterInput, meta: SessionMeta): Promise<AuthResult> {
    const loginName = input.loginName.trim();
    const loginNameNormalized = normalizeLoginName(input.loginName);
    const displayName = input.displayName?.trim() || null;
    const now = new Date();

    const existingUser = await this.db.user.findUnique({
      where: { loginNameNormalized },
      select: { id: true }
    });

    if (existingUser) {
      throw authError("LOGIN_NAME_TAKEN", "登录名已被占用", 409);
    }

    const passwordHash = await hashPassword(input.password);

    try {
      return await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: `usr_${randomUUID()}`,
            loginName,
            loginNameNormalized,
            displayName,
            passwordHash,
            timezone: DEFAULT_TIMEZONE,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now
          },
          select: {
            id: true,
            loginName: true,
            displayName: true,
            timezone: true,
            createdAt: true
          }
        });

        await tx.userSetting.create({
          data: {
            userId: user.id,
            schemaVersion: 2,
            aiEnabled: true,
            aiModel: "gpt-4o-mini",
            aiBaseUrl: "https://api.openai.com/v1",
            aiAssistantPrompt: DEFAULT_AI_ASSISTANT_PROMPT,
            ringtoneEnabled: true,
            ringtoneSound: "chime",
            ringtoneVolume: 70,
            ringtoneAdvanceMinutes: 15,
            feedbackCompleteSound: true,
            feedbackCompleteAnimation: true,
            feedbackOperationSound: false,
            createdAt: now,
            updatedAt: now
          }
        });

        const session = await createSession(tx, user.id, meta, now);

        return { user, session };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw authError("LOGIN_NAME_TAKEN", "登录名已被占用", 409);
      }

      throw error;
    }
  }

  async login(input: LoginInput, meta: SessionMeta): Promise<AuthResult> {
    const loginNameNormalized = normalizeLoginName(input.loginName);
    const now = new Date();

    const user = await this.db.user.findUnique({
      where: { loginNameNormalized },
      select: {
        id: true,
        loginName: true,
        displayName: true,
        timezone: true,
        passwordHash: true,
        createdAt: true,
        disabledAt: true
      }
    });

    if (!user || user.disabledAt) {
      throw invalidCredentialsError();
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);

    if (!passwordValid) {
      throw invalidCredentialsError();
    }

    const result = await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: now,
          updatedAt: now
        },
        select: { id: true }
      });

      const session = await createSession(tx, user.id, meta, now);

      return {
        user: {
          id: user.id,
          loginName: user.loginName,
          displayName: user.displayName,
          timezone: user.timezone,
          createdAt: user.createdAt
        },
        session
      };
    });

    return result;
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.db.user.findFirst({
      where: {
        id: userId,
        disabledAt: null
      },
      select: {
        id: true,
        loginName: true,
        displayName: true,
        timezone: true,
        createdAt: true
      }
    });

    if (!user) {
      throw unauthenticatedError();
    }

    return user;
  }
}
