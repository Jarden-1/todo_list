import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { getApiErrorMessage } from "../lib/apiClient";
import {
  deleteAiApiKey as deleteAiApiKeyRequest,
  fetchSettings,
  patchSettings,
  replaceSettings as replaceSettingsRequest,
  saveAiApiKey as saveAiApiKeyRequest,
} from "../lib/settingsApi";
import type {
  AiModelConfig,
  AppSettings,
  FeedbackConfig,
  RingtoneConfig,
  ServerAppSettings,
} from "../lib/settingsTypes";
import {
  DEFAULT_ASSISTANT_PROMPT,
  DEFAULT_SETTINGS,
  mergeSettings,
  toServerSettings,
} from "../lib/settingsTypes";

export { DEFAULT_ASSISTANT_PROMPT };
export type {
  AiModelConfig,
  AppSettings,
  FeedbackConfig,
  RingtoneConfig,
  ServerAppSettings,
};

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<AppSettings>;
  hydrateSettings: (settings: ServerAppSettings | Partial<AppSettings> | null | undefined) => void;
  updateAiModel: (updates: Partial<Omit<AiModelConfig, "hasApiKey">>) => Promise<void>;
  updateRingtone: (updates: Partial<RingtoneConfig>) => Promise<void>;
  updateFeedback: (updates: Partial<FeedbackConfig>) => Promise<void>;
  replaceSettings: (settings: Partial<AppSettings> | ServerAppSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
  saveAiApiKey: (apiKey: string) => Promise<void>;
  deleteAiApiKey: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function getLocalRingtoneState(settings: AppSettings): Partial<RingtoneConfig> {
  return {
    browserNotificationsEnabled: settings.ringtone.browserNotificationsEnabled,
    pushSubscriptionId: settings.ringtone.pushSubscriptionId,
    pushEndpoint: settings.ringtone.pushEndpoint,
  };
}

function splitRingtonePatch(updates: Partial<RingtoneConfig>) {
  const serverPatch: Partial<ServerAppSettings["ringtone"]> = {};
  const localPatch: Partial<RingtoneConfig> = {};

  if ("enabled" in updates) serverPatch.enabled = updates.enabled;
  if ("sound" in updates) serverPatch.sound = updates.sound;
  if ("volume" in updates) serverPatch.volume = updates.volume;
  if ("advanceMinutes" in updates) serverPatch.advanceMinutes = updates.advanceMinutes;

  if ("browserNotificationsEnabled" in updates) {
    localPatch.browserNotificationsEnabled = updates.browserNotificationsEnabled;
  }
  if ("pushSubscriptionId" in updates) {
    localPatch.pushSubscriptionId = updates.pushSubscriptionId;
  }
  if ("pushEndpoint" in updates) {
    localPatch.pushEndpoint = updates.pushEndpoint;
  }

  return { serverPatch, localPatch };
}

function hasKeys(value: object) {
  return Object.keys(value).length > 0;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateSettings = useCallback(
    (incoming: ServerAppSettings | Partial<AppSettings> | null | undefined) => {
      setSettings((prev) => mergeSettings(incoming, getLocalRingtoneState(prev)));
      setError(null);
    },
    []
  );

  const refreshSettings = useCallback(async () => {
    setLoading(true);
    try {
      const remote = await fetchSettings();
      const next = mergeSettings(remote, getLocalRingtoneState(settings));
      setSettings(next);
      setError(null);
      return next;
    } catch (caught) {
      const message = getApiErrorMessage(caught);
      setError(message);
      throw caught;
    } finally {
      setLoading(false);
    }
  }, [settings]);

  const updateAiModel = useCallback(
    async (updates: Partial<Omit<AiModelConfig, "hasApiKey">>) => {
      const remote = await patchSettings({ aiModel: updates });
      setSettings((prev) => mergeSettings(remote, getLocalRingtoneState(prev)));
      setError(null);
    },
    []
  );

  const updateRingtone = useCallback(async (updates: Partial<RingtoneConfig>) => {
    const { serverPatch, localPatch } = splitRingtonePatch(updates);

    if (hasKeys(localPatch)) {
      setSettings((prev) => ({
        ...prev,
        ringtone: { ...prev.ringtone, ...localPatch },
      }));
    }

    if (!hasKeys(serverPatch)) {
      setError(null);
      return;
    }

    const remote = await patchSettings({ ringtone: serverPatch });
    setSettings((prev) => mergeSettings(remote, {
      ...getLocalRingtoneState(prev),
      ...localPatch,
    }));
    setError(null);
  }, []);

  const updateFeedback = useCallback(async (updates: Partial<FeedbackConfig>) => {
    const remote = await patchSettings({ feedback: updates });
    setSettings((prev) => mergeSettings(remote, getLocalRingtoneState(prev)));
    setError(null);
  }, []);

  const replaceSettings = useCallback(
    async (incoming: Partial<AppSettings> | ServerAppSettings) => {
      const next = mergeSettings(incoming, getLocalRingtoneState(settings));
      const remote = await replaceSettingsRequest(toServerSettings(next));
      setSettings((prev) => mergeSettings(remote, getLocalRingtoneState(prev)));
      setError(null);
    },
    [settings]
  );

  const resetSettings = useCallback(async () => {
    const next = mergeSettings(DEFAULT_SETTINGS, getLocalRingtoneState(settings));
    const remote = await replaceSettingsRequest(toServerSettings(next));
    setSettings((prev) => mergeSettings(remote, getLocalRingtoneState(prev)));
    setError(null);
  }, [settings]);

  const saveAiApiKey = useCallback(async (apiKey: string) => {
    const result = await saveAiApiKeyRequest(apiKey);
    setSettings((prev) => ({
      ...prev,
      aiModel: { ...prev.aiModel, hasApiKey: result.hasApiKey },
    }));
    setError(null);
  }, []);

  const deleteAiApiKey = useCallback(async () => {
    const result = await deleteAiApiKeyRequest();
    setSettings((prev) => ({
      ...prev,
      aiModel: { ...prev.aiModel, hasApiKey: result.hasApiKey },
    }));
    setError(null);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      loading,
      error,
      refreshSettings,
      hydrateSettings,
      updateAiModel,
      updateRingtone,
      updateFeedback,
      replaceSettings,
      resetSettings,
      saveAiApiKey,
      deleteAiApiKey,
    }),
    [
      deleteAiApiKey,
      error,
      hydrateSettings,
      loading,
      refreshSettings,
      replaceSettings,
      resetSettings,
      saveAiApiKey,
      settings,
      updateAiModel,
      updateFeedback,
      updateRingtone,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
