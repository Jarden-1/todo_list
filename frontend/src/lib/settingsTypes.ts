export const DEFAULT_ASSISTANT_PROMPT = `你是 SmartTodo 的 AI 待办助手。

请帮助用户把自然语言整理成清晰、可执行、适合长期回看的待办内容。
你需要尽量识别标题、截止时间、优先级、项目、子任务、提醒和注意事项。
不要虚构事实；不确定的信息要保守处理，并提醒用户确认。
输出应简洁、具体，正文默认使用 Markdown。`;

export interface AiModelConfig {
  enabled: boolean;
  model: string;
  baseUrl: string;
  assistantPrompt: string;
  hasApiKey: boolean;
}

export interface RingtoneConfig {
  enabled: boolean;
  sound: string;
  volume: number;
  advanceMinutes: number;
  browserNotificationsEnabled: boolean;
  pushSubscriptionId?: string;
  pushEndpoint?: string;
}

export interface FeedbackConfig {
  completeSound: boolean;
  completeAnimation: boolean;
  operationSound: boolean;
}

export interface AppSettings {
  schemaVersion: 2;
  aiModel: AiModelConfig;
  ringtone: RingtoneConfig;
  feedback: FeedbackConfig;
}

export type ServerAppSettings = Omit<AppSettings, "ringtone"> & {
  ringtone: Omit<
    RingtoneConfig,
    "browserNotificationsEnabled" | "pushSubscriptionId" | "pushEndpoint"
  >;
};

export type SettingsPatch = {
  aiModel?: Partial<Omit<AiModelConfig, "hasApiKey">>;
  ringtone?: Partial<ServerAppSettings["ringtone"]>;
  feedback?: Partial<FeedbackConfig>;
};

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 2,
  aiModel: {
    enabled: true,
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    assistantPrompt: DEFAULT_ASSISTANT_PROMPT,
    hasApiKey: false,
  },
  ringtone: {
    enabled: true,
    sound: "chime",
    volume: 70,
    advanceMinutes: 15,
    browserNotificationsEnabled: false,
  },
  feedback: {
    completeSound: true,
    completeAnimation: true,
    operationSound: false,
  },
};

export function mergeSettings(
  incoming: Partial<AppSettings | ServerAppSettings> | null | undefined,
  previousLocal: Partial<RingtoneConfig> = {}
): AppSettings {
  return {
    schemaVersion: 2,
    aiModel: {
      ...DEFAULT_SETTINGS.aiModel,
      ...(incoming?.aiModel ?? {}),
      hasApiKey: incoming?.aiModel?.hasApiKey ?? DEFAULT_SETTINGS.aiModel.hasApiKey,
    },
    ringtone: {
      ...DEFAULT_SETTINGS.ringtone,
      ...previousLocal,
      ...(incoming?.ringtone ?? {}),
      browserNotificationsEnabled:
        previousLocal.browserNotificationsEnabled ??
        DEFAULT_SETTINGS.ringtone.browserNotificationsEnabled,
      pushSubscriptionId: previousLocal.pushSubscriptionId,
      pushEndpoint: previousLocal.pushEndpoint,
    },
    feedback: {
      ...DEFAULT_SETTINGS.feedback,
      ...(incoming?.feedback ?? {}),
    },
  };
}

export function toServerSettings(settings: AppSettings): ServerAppSettings {
  return {
    schemaVersion: 2,
    aiModel: {
      enabled: settings.aiModel.enabled,
      model: settings.aiModel.model,
      baseUrl: settings.aiModel.baseUrl,
      assistantPrompt: settings.aiModel.assistantPrompt,
      hasApiKey: settings.aiModel.hasApiKey,
    },
    ringtone: {
      enabled: settings.ringtone.enabled,
      sound: settings.ringtone.sound,
      volume: settings.ringtone.volume,
      advanceMinutes: settings.ringtone.advanceMinutes,
    },
    feedback: {
      completeSound: settings.feedback.completeSound,
      completeAnimation: settings.feedback.completeAnimation,
      operationSound: settings.feedback.operationSound,
    },
  };
}
