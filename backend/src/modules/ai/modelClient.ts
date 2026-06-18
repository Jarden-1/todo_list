import { ApiError } from "../../common/apiError";
import { aiModuleError } from "./ai.errors";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  responseFormat?: "json_object";
}

interface OpenAiCompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

function getChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");

  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

export async function createChatCompletion(
  request: ChatCompletionRequest
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(getChatCompletionsUrl(request.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        ...(request.responseFormat
          ? { response_format: { type: request.responseFormat } }
          : {})
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw aiModuleError("AI_MODEL_ERROR", "AI 模型请求失败", 502, {
        status: response.status
      });
    }

    const payload = (await response.json()) as OpenAiCompatibleResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw aiModuleError("AI_MODEL_ERROR", "AI 返回内容为空", 502);
    }

    return content;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw aiModuleError("AI_MODEL_ERROR", "AI 模型请求超时", 502);
    }

    throw aiModuleError("AI_MODEL_ERROR", "AI 模型请求失败", 502);
  } finally {
    clearTimeout(timeout);
  }
}
