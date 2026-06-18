import { z } from "zod";

const aiModelSettingsSchema = z
  .object({
    enabled: z.boolean(),
    model: z.string().trim().min(1).max(120),
    baseUrl: z.string().trim().url().max(500),
    assistantPrompt: z.string().max(8000),
    hasApiKey: z.boolean().optional()
  })
  .strict();

const ringtoneSettingsSchema = z
  .object({
    enabled: z.boolean(),
    sound: z.string().trim().min(1).max(80),
    volume: z.number().int().min(0).max(100),
    advanceMinutes: z.number().int().min(0).max(10080)
  })
  .strict();

const feedbackSettingsSchema = z
  .object({
    completeSound: z.boolean(),
    completeAnimation: z.boolean(),
    operationSound: z.boolean()
  })
  .strict();

export const replaceSettingsSchema = z
  .object({
    schemaVersion: z.literal(2).optional(),
    aiModel: aiModelSettingsSchema,
    ringtone: ringtoneSettingsSchema,
    feedback: feedbackSettingsSchema
  })
  .strict();

const aiModelPatchSchema = aiModelSettingsSchema
  .omit({ hasApiKey: true })
  .partial()
  .strict();

const ringtonePatchSchema = ringtoneSettingsSchema.partial().strict();
const feedbackPatchSchema = feedbackSettingsSchema.partial().strict();

function hasNestedPatchValue(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value).some(
    (section) =>
      !!section && typeof section === "object" && Object.keys(section).length > 0
  );
}

export const patchSettingsSchema = z
  .object({
    aiModel: aiModelPatchSchema.optional(),
    ringtone: ringtonePatchSchema.optional(),
    feedback: feedbackPatchSchema.optional()
  })
  .strict()
  .refine(hasNestedPatchValue, {
    message: "至少提供一个设置项"
  });

export const saveAiKeySchema = z
  .object({
    apiKey: z.string().trim().min(1).max(4096)
  })
  .strict();

export type ReplaceSettingsInput = z.infer<typeof replaceSettingsSchema>;
export type PatchSettingsInput = z.infer<typeof patchSettingsSchema>;
export type SaveAiKeyInput = z.infer<typeof saveAiKeySchema>;
