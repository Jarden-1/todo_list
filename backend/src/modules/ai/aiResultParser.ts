import { z } from "zod";

import {
  aiConfidenceSchema,
  aiTodoResultSchema,
  todoPrioritySchema,
  type AiTodoResult
} from "./ai.schemas";
import { aiModuleError } from "./ai.errors";
import {
  replaceImagesWithPlaceholders,
  restoreImagePlaceholders
} from "./markdownImages";

const looseAiTodoResultSchema = z
  .object({
    title: z.unknown().optional(),
    projectName: z.unknown().optional(),
    priority: z.unknown().optional(),
    dueAt: z.unknown().optional(),
    reminders: z.unknown().optional(),
    tags: z.unknown().optional(),
    subtasks: z.unknown().optional(),
    contentMarkdown: z.unknown().optional(),
    confidence: z.unknown().optional(),
    warnings: z.unknown().optional()
  })
  .passthrough();

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength).trim() : value;
}

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? truncate(trimmed, maxLength) : undefined;
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const output: string[] = [];

  value.forEach((item) => {
    const cleaned = cleanString(item, maxLength);
    const key = cleaned?.toLocaleLowerCase();

    if (!cleaned || !key || seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(cleaned);
  });

  return output.slice(0, maxItems);
}

function toIsoString(value: unknown): string | undefined {
  const cleaned = cleanString(value, 80);

  if (!cleaned) {
    return undefined;
  }

  const timestamp = Date.parse(cleaned);

  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

function normalizePriority(value: unknown): AiTodoResult["priority"] {
  const parsed = todoPrioritySchema.safeParse(value);
  return parsed.success ? parsed.data : "medium";
}

function normalizeConfidence(value: unknown): AiTodoResult["confidence"] | undefined {
  const parsed = aiConfidenceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function normalizeWarnings(value: unknown): string[] {
  return cleanStringArray(value, 20, 500);
}

function normalizeReminders(value: unknown): AiTodoResult["reminders"] {
  if (!Array.isArray(value)) {
    return [];
  }

  const reminders: Array<{ remindAt: string; reason?: string }> = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const remindAt = toIsoString(record.remindAt);

    if (!remindAt) {
      continue;
    }

    const reason = cleanString(record.reason, 300);
    reminders.push(reason ? { remindAt, reason } : { remindAt });
  }

  return reminders.slice(0, 20);
}

function fallbackTitle(originalInput: string): string {
  const collapsed = originalInput.replace(/\s+/g, " ").trim();
  return truncate(collapsed || "新待办", 80);
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");

    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFence.slice(start, end + 1));
      } catch {
        throw aiModuleError("AI_RESULT_INVALID", "AI 返回内容不是有效 JSON", 422);
      }
    }

    throw aiModuleError("AI_RESULT_INVALID", "AI 返回内容不是有效 JSON", 422);
  }
}

export function parseAiTodoResult(content: string, originalInput: string): AiTodoResult {
  const parsed = looseAiTodoResultSchema.safeParse(parseJsonObject(content));

  if (!parsed.success) {
    throw aiModuleError("AI_RESULT_INVALID", "AI 返回结构不正确", 422);
  }

  const contentMarkdown = cleanString(parsed.data.contentMarkdown, 1024 * 1024) ?? "";
  const { placeholders } = replaceImagesWithPlaceholders(originalInput);
  const restoredContentMarkdown = restoreImagePlaceholders(contentMarkdown, placeholders);

  const normalized = {
    title: cleanString(parsed.data.title, 200) ?? fallbackTitle(originalInput),
    projectName: cleanString(parsed.data.projectName, 120),
    priority: normalizePriority(parsed.data.priority),
    dueAt: toIsoString(parsed.data.dueAt),
    reminders: normalizeReminders(parsed.data.reminders),
    tags: cleanStringArray(parsed.data.tags, 20, 60),
    subtasks: cleanStringArray(parsed.data.subtasks, 100, 200),
    contentMarkdown: restoredContentMarkdown,
    confidence: normalizeConfidence(parsed.data.confidence),
    warnings: normalizeWarnings(parsed.data.warnings)
  };

  const result = aiTodoResultSchema.safeParse(normalized);

  if (!result.success) {
    throw aiModuleError("AI_RESULT_INVALID", "AI 返回结构不正确", 422);
  }

  return result.data;
}
