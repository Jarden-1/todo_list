// SmartTodo - Settings Context
// Stores: AI assistant config, due reminders, and lightweight feedback settings
import React, { createContext, useContext, useState, useEffect } from "react";

export const DEFAULT_ASSISTANT_PROMPT = `你是 SmartTodo 的 AI 待办助手。

请帮助用户把自然语言整理成清晰、可执行、适合长期回看的待办内容。
你需要尽量识别标题、截止时间、优先级、项目、子任务、提醒和注意事项。
不要虚构事实；不确定的信息要保守处理，并提醒用户确认。
输出应简洁、具体，正文默认使用 Markdown。`;

export interface AiModelConfig {
  enabled: boolean;
  model: string;
  apiKey: string;
  baseUrl: string;
  assistantPrompt: string;
}

export interface RingtoneConfig {
  enabled: boolean;
  sound: string;          // preset sound name
  volume: number;         // 0-100
  advanceMinutes: number; // remind N minutes before due
}

export interface FeedbackConfig {
  completeSound: boolean;
  completeAnimation: boolean;
  operationSound: boolean;
}

export interface AppSettings {
  schemaVersion: number;
  aiModel: AiModelConfig;
  ringtone: RingtoneConfig;
  feedback: FeedbackConfig;
}

const SETTINGS_SCHEMA_VERSION = 2;

const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  aiModel: {
    enabled: true,
    model: "gpt-4o-mini",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    assistantPrompt: DEFAULT_ASSISTANT_PROMPT,
  },
  ringtone: {
    enabled: true,
    sound: "chime",
    volume: 70,
    advanceMinutes: 15,
  },
  feedback: {
    completeSound: true,
    completeAnimation: true,
    operationSound: false,
  },
};

const SETTINGS_KEY = "smarttodo:settings";

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const isLegacySettings = parsed.schemaVersion !== SETTINGS_SCHEMA_VERSION;

    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      aiModel: {
        ...DEFAULT_SETTINGS.aiModel,
        ...(parsed.aiModel ?? {}),
        enabled: isLegacySettings
          ? DEFAULT_SETTINGS.aiModel.enabled
          : parsed.aiModel?.enabled ?? DEFAULT_SETTINGS.aiModel.enabled,
      },
      ringtone: {
        ...DEFAULT_SETTINGS.ringtone,
        ...(parsed.ringtone ?? {}),
        enabled: isLegacySettings
          ? DEFAULT_SETTINGS.ringtone.enabled
          : parsed.ringtone?.enabled ?? DEFAULT_SETTINGS.ringtone.enabled,
      },
      feedback: {
        ...DEFAULT_SETTINGS.feedback,
        ...(parsed.feedback ?? {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsContextValue {
  settings: AppSettings;
  updateAiModel: (updates: Partial<AiModelConfig>) => void;
  updateRingtone: (updates: Partial<RingtoneConfig>) => void;
  updateFeedback: (updates: Partial<FeedbackConfig>) => void;
  replaceSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateAiModel = (updates: Partial<AiModelConfig>) => {
    setSettings((prev) => ({
      ...prev,
      aiModel: { ...prev.aiModel, ...updates },
    }));
  };

  const updateRingtone = (updates: Partial<RingtoneConfig>) => {
    setSettings((prev) => ({
      ...prev,
      ringtone: { ...prev.ringtone, ...updates },
    }));
  };

  const updateFeedback = (updates: Partial<FeedbackConfig>) => {
    setSettings((prev) => ({
      ...prev,
      feedback: { ...prev.feedback, ...updates },
    }));
  };

  const replaceSettings = (incoming: Partial<AppSettings>) => {
    setSettings({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      aiModel: {
        ...DEFAULT_SETTINGS.aiModel,
        ...(incoming.aiModel ?? {}),
      },
      ringtone: {
        ...DEFAULT_SETTINGS.ringtone,
        ...(incoming.ringtone ?? {}),
      },
      feedback: {
        ...DEFAULT_SETTINGS.feedback,
        ...(incoming.feedback ?? {}),
      },
    });
  };

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  return (
    <SettingsContext.Provider value={{ settings, updateAiModel, updateRingtone, updateFeedback, replaceSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
