import type { Prisma, PrismaClient, UserSetting } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { decryptAiApiKey, encryptAiApiKey } from "./aiKeyCrypto";
import {
  DEFAULT_SETTINGS,
  type AiKeyStatusDto,
  type SettingsDto
} from "./settings.dto";
import type {
  PatchSettingsInput,
  ReplaceSettingsInput
} from "./settings.schemas";

export interface ReminderAdvanceMinutesChangedEvent {
  type: "settings.ringtoneAdvanceMinutesChanged";
  userId: string;
  previousAdvanceMinutes: number;
  nextAdvanceMinutes: number;
  occurredAt: string;
}

export type SettingsDomainEvent = ReminderAdvanceMinutesChangedEvent;

export interface SettingsMutationResult {
  settings: SettingsDto;
  events: SettingsDomainEvent[];
}

export interface UserAiConfig {
  enabled: boolean;
  model: string;
  baseUrl: string;
  assistantPrompt: string;
  apiKey: string;
}

interface ReplaceSettingsData {
  schemaVersion: number;
  aiEnabled: boolean;
  aiModel: string;
  aiBaseUrl: string;
  aiAssistantPrompt: string;
  ringtoneEnabled: boolean;
  ringtoneSound: string;
  ringtoneVolume: number;
  ringtoneAdvanceMinutes: number;
  feedbackCompleteSound: boolean;
  feedbackCompleteAnimation: boolean;
  feedbackOperationSound: boolean;
  updatedAt: Date;
}

function hasEncryptedApiKey(settings: UserSetting): boolean {
  return Boolean(
    settings.aiApiKeyCiphertext &&
      settings.aiApiKeyIv &&
      settings.aiApiKeyAuthTag
  );
}

function toSettingsDto(settings: UserSetting): SettingsDto {
  return {
    schemaVersion: 2,
    aiModel: {
      enabled: settings.aiEnabled,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      assistantPrompt: settings.aiAssistantPrompt,
      hasApiKey: hasEncryptedApiKey(settings)
    },
    ringtone: {
      enabled: settings.ringtoneEnabled,
      sound: settings.ringtoneSound,
      volume: settings.ringtoneVolume,
      advanceMinutes: settings.ringtoneAdvanceMinutes
    },
    feedback: {
      completeSound: settings.feedbackCompleteSound,
      completeAnimation: settings.feedbackCompleteAnimation,
      operationSound: settings.feedbackOperationSound
    }
  };
}

function getDefaultCreateData(userId: string, now = new Date()) {
  return {
    userId,
    schemaVersion: DEFAULT_SETTINGS.schemaVersion,
    aiEnabled: DEFAULT_SETTINGS.aiModel.enabled,
    aiModel: DEFAULT_SETTINGS.aiModel.model,
    aiBaseUrl: DEFAULT_SETTINGS.aiModel.baseUrl,
    aiAssistantPrompt: DEFAULT_SETTINGS.aiModel.assistantPrompt,
    ringtoneEnabled: DEFAULT_SETTINGS.ringtone.enabled,
    ringtoneSound: DEFAULT_SETTINGS.ringtone.sound,
    ringtoneVolume: DEFAULT_SETTINGS.ringtone.volume,
    ringtoneAdvanceMinutes: DEFAULT_SETTINGS.ringtone.advanceMinutes,
    feedbackCompleteSound: DEFAULT_SETTINGS.feedback.completeSound,
    feedbackCompleteAnimation: DEFAULT_SETTINGS.feedback.completeAnimation,
    feedbackOperationSound: DEFAULT_SETTINGS.feedback.operationSound,
    createdAt: now,
    updatedAt: now
  };
}

function toReplaceData(
  input: ReplaceSettingsInput,
  now = new Date()
): ReplaceSettingsData {
  return {
    schemaVersion: input.schemaVersion ?? DEFAULT_SETTINGS.schemaVersion,
    aiEnabled: input.aiModel.enabled,
    aiModel: input.aiModel.model,
    aiBaseUrl: input.aiModel.baseUrl,
    aiAssistantPrompt: input.aiModel.assistantPrompt,
    ringtoneEnabled: input.ringtone.enabled,
    ringtoneSound: input.ringtone.sound,
    ringtoneVolume: input.ringtone.volume,
    ringtoneAdvanceMinutes: input.ringtone.advanceMinutes,
    feedbackCompleteSound: input.feedback.completeSound,
    feedbackCompleteAnimation: input.feedback.completeAnimation,
    feedbackOperationSound: input.feedback.operationSound,
    updatedAt: now
  };
}

function toPatchData(
  input: PatchSettingsInput,
  now = new Date()
): Prisma.UserSettingUncheckedUpdateInput {
  const data: Prisma.UserSettingUncheckedUpdateInput = {
    updatedAt: now
  };

  if (input.aiModel?.enabled !== undefined) {
    data.aiEnabled = input.aiModel.enabled;
  }
  if (input.aiModel?.model !== undefined) {
    data.aiModel = input.aiModel.model;
  }
  if (input.aiModel?.baseUrl !== undefined) {
    data.aiBaseUrl = input.aiModel.baseUrl;
  }
  if (input.aiModel?.assistantPrompt !== undefined) {
    data.aiAssistantPrompt = input.aiModel.assistantPrompt;
  }
  if (input.ringtone?.enabled !== undefined) {
    data.ringtoneEnabled = input.ringtone.enabled;
  }
  if (input.ringtone?.sound !== undefined) {
    data.ringtoneSound = input.ringtone.sound;
  }
  if (input.ringtone?.volume !== undefined) {
    data.ringtoneVolume = input.ringtone.volume;
  }
  if (input.ringtone?.advanceMinutes !== undefined) {
    data.ringtoneAdvanceMinutes = input.ringtone.advanceMinutes;
  }
  if (input.feedback?.completeSound !== undefined) {
    data.feedbackCompleteSound = input.feedback.completeSound;
  }
  if (input.feedback?.completeAnimation !== undefined) {
    data.feedbackCompleteAnimation = input.feedback.completeAnimation;
  }
  if (input.feedback?.operationSound !== undefined) {
    data.feedbackOperationSound = input.feedback.operationSound;
  }

  return data;
}

function buildAdvanceMinutesEvent(
  userId: string,
  previousAdvanceMinutes: number,
  nextAdvanceMinutes: number,
  now = new Date()
): SettingsDomainEvent[] {
  if (previousAdvanceMinutes === nextAdvanceMinutes) {
    return [];
  }

  return [
    {
      type: "settings.ringtoneAdvanceMinutesChanged",
      userId,
      previousAdvanceMinutes,
      nextAdvanceMinutes,
      occurredAt: now.toISOString()
    }
  ];
}

async function getOrCreateSettingsRecord(
  prisma: PrismaClient,
  userId: string
): Promise<UserSetting> {
  const existing = await prisma.userSetting.findUnique({
    where: { userId }
  });

  if (existing) {
    return existing;
  }

  return prisma.userSetting.create({
    data: getDefaultCreateData(userId)
  });
}

export async function getSettings(
  prisma: PrismaClient,
  userId: string
): Promise<SettingsDto> {
  return toSettingsDto(await getOrCreateSettingsRecord(prisma, userId));
}

export async function replaceSettings(
  prisma: PrismaClient,
  userId: string,
  input: ReplaceSettingsInput
): Promise<SettingsMutationResult> {
  const existing = await prisma.userSetting.findUnique({
    where: { userId }
  });
  const now = new Date();
  const previousAdvanceMinutes =
    existing?.ringtoneAdvanceMinutes ?? DEFAULT_SETTINGS.ringtone.advanceMinutes;
  const replaceData = toReplaceData(input, now);

  const settings = await prisma.userSetting.upsert({
    where: { userId },
    create: {
      ...getDefaultCreateData(userId, now),
      ...replaceData,
      createdAt: now
    },
    update: replaceData
  });

  return {
    settings: toSettingsDto(settings),
    events: existing
      ? buildAdvanceMinutesEvent(
          userId,
          previousAdvanceMinutes,
          settings.ringtoneAdvanceMinutes,
          now
        )
      : []
  };
}

export async function patchSettings(
  prisma: PrismaClient,
  userId: string,
  input: PatchSettingsInput
): Promise<SettingsMutationResult> {
  const existing = await getOrCreateSettingsRecord(prisma, userId);
  const now = new Date();
  const settings = await prisma.userSetting.update({
    where: { userId },
    data: toPatchData(input, now)
  });

  return {
    settings: toSettingsDto(settings),
    // TODO(todos/notifications): consume this event to recompute unsent
    // default due reminders when the user's advance-minutes preference changes.
    events: buildAdvanceMinutesEvent(
      userId,
      existing.ringtoneAdvanceMinutes,
      settings.ringtoneAdvanceMinutes,
      now
    )
  };
}

export async function saveAiApiKey(
  prisma: PrismaClient,
  userId: string,
  apiKey: string
): Promise<AiKeyStatusDto> {
  const encrypted = encryptAiApiKey(apiKey);
  const now = new Date();

  await prisma.userSetting.upsert({
    where: { userId },
    create: {
      ...getDefaultCreateData(userId, now),
      aiApiKeyCiphertext: encrypted.ciphertext,
      aiApiKeyIv: encrypted.iv,
      aiApiKeyAuthTag: encrypted.authTag
    },
    update: {
      aiApiKeyCiphertext: encrypted.ciphertext,
      aiApiKeyIv: encrypted.iv,
      aiApiKeyAuthTag: encrypted.authTag,
      updatedAt: now
    }
  });

  return { hasApiKey: true };
}

export async function deleteAiApiKey(
  prisma: PrismaClient,
  userId: string
): Promise<AiKeyStatusDto> {
  const now = new Date();

  await prisma.userSetting.upsert({
    where: { userId },
    create: getDefaultCreateData(userId, now),
    update: {
      aiApiKeyCiphertext: null,
      aiApiKeyIv: null,
      aiApiKeyAuthTag: null,
      updatedAt: now
    }
  });

  return { hasApiKey: false };
}

export async function getUserAiConfig(
  prisma: PrismaClient,
  userId: string
): Promise<UserAiConfig | null> {
  const settings = await getOrCreateSettingsRecord(prisma, userId);

  if (!hasEncryptedApiKey(settings)) {
    return null;
  }

  try {
    return {
      enabled: settings.aiEnabled,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      assistantPrompt: settings.aiAssistantPrompt,
      apiKey: decryptAiApiKey({
        ciphertext: settings.aiApiKeyCiphertext ?? "",
        iv: settings.aiApiKeyIv ?? "",
        authTag: settings.aiApiKeyAuthTag ?? ""
      })
    };
  } catch {
    throw new ApiError(
      "BUSINESS_ERROR",
      "AI API Key 无法解密，请在设置页重新保存",
      422
    );
  }
}

export async function requireUserAiConfig(
  prisma: PrismaClient,
  userId: string
): Promise<UserAiConfig> {
  const aiConfig = await getUserAiConfig(prisma, userId);

  if (!aiConfig) {
    throw new ApiError("AI_KEY_REQUIRED", "请先在设置页填写 AI API Key", 422);
  }

  return aiConfig;
}
