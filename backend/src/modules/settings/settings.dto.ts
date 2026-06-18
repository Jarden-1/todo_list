export interface AiModelSettingsDto {
  enabled: boolean;
  model: string;
  baseUrl: string;
  assistantPrompt: string;
  hasApiKey: boolean;
}

export interface RingtoneSettingsDto {
  enabled: boolean;
  sound: string;
  volume: number;
  advanceMinutes: number;
}

export interface FeedbackSettingsDto {
  completeSound: boolean;
  completeAnimation: boolean;
  operationSound: boolean;
}

export interface SettingsDto {
  schemaVersion: 2;
  aiModel: AiModelSettingsDto;
  ringtone: RingtoneSettingsDto;
  feedback: FeedbackSettingsDto;
}

export interface AiKeyStatusDto {
  hasApiKey: boolean;
}

export const DEFAULT_ASSISTANT_PROMPT = "你是 SmartTodo 的 AI 待办助手。";

export const DEFAULT_SETTINGS: Omit<SettingsDto, "aiModel"> & {
  aiModel: Omit<AiModelSettingsDto, "hasApiKey">;
} = {
  schemaVersion: 2,
  aiModel: {
    enabled: true,
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    assistantPrompt: DEFAULT_ASSISTANT_PROMPT
  },
  ringtone: {
    enabled: true,
    sound: "chime",
    volume: 70,
    advanceMinutes: 15
  },
  feedback: {
    completeSound: true,
    completeAnimation: true,
    operationSound: false
  }
};
