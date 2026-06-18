import type { AiModelConfig } from "../contexts/SettingsContext";
import { DEFAULT_ASSISTANT_PROMPT } from "../contexts/SettingsContext";

export interface AiClientConfig {
  model: string;
  apiKey: string;
  chatCompletionsUrl: string;
  assistantPrompt: string;
}

export function resolveAiClientConfig(aiModel: AiModelConfig): AiClientConfig {
  if (!aiModel.enabled) {
    throw new Error("请先在设置中启用 AI 助手");
  }

  const model = aiModel.model.trim();
  const apiKey = aiModel.apiKey.trim();
  const baseUrl = aiModel.baseUrl.trim().replace(/\/+$/, "");
  const assistantPrompt = aiModel.assistantPrompt.trim() || DEFAULT_ASSISTANT_PROMPT;

  if (!model) throw new Error("请先在设置中填写模型名称");
  if (!baseUrl) throw new Error("请先在设置中填写 Base URL");
  if (!apiKey) throw new Error("请先在设置中填写 API Key");

  return {
    model,
    apiKey,
    chatCompletionsUrl: baseUrl.endsWith("/chat/completions")
      ? baseUrl
      : `${baseUrl}/chat/completions`,
    assistantPrompt,
  };
}
