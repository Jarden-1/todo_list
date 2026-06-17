// SmartTodo - Settings Context
// Stores: AI model config, ringtone/reminder settings
import React, { createContext, useContext, useState, useEffect } from "react";

export interface AiModelConfig {
  provider: string;       // e.g. "OpenAI", "Anthropic", "Custom"
  model: string;          // e.g. "gpt-4o-mini", "claude-3-5-sonnet"
  apiKey: string;         // user-provided key (stored locally only)
  baseUrl: string;        // API base URL
  maxTokens: number;
  temperature: number;
}

export interface RingtoneConfig {
  enabled: boolean;
  sound: string;          // preset sound name
  volume: number;         // 0-100
  advanceMinutes: number; // remind N minutes before due
}

export interface AppSettings {
  aiModel: AiModelConfig;
  ringtone: RingtoneConfig;
}

const DEFAULT_SETTINGS: AppSettings = {
  aiModel: {
    provider: "OpenAI",
    model: "gpt-4o-mini",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    maxTokens: 1024,
    temperature: 0.3,
  },
  ringtone: {
    enabled: false,
    sound: "chime",
    volume: 70,
    advanceMinutes: 15,
  },
};

const SETTINGS_KEY = "smarttodo:settings";

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsContextValue {
  settings: AppSettings;
  updateAiModel: (updates: Partial<AiModelConfig>) => void;
  updateRingtone: (updates: Partial<RingtoneConfig>) => void;
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

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  return (
    <SettingsContext.Provider value={{ settings, updateAiModel, updateRingtone, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
