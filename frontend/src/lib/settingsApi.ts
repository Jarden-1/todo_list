import { apiRequest } from "./apiClient";
import type {
  AiModelConfig,
  AppSettings,
  ServerAppSettings,
  SettingsPatch,
} from "./settingsTypes";
import { toServerSettings } from "./settingsTypes";

export function fetchSettings(signal?: AbortSignal) {
  return apiRequest<ServerAppSettings>("/settings", { signal });
}

export function patchSettings(patch: SettingsPatch) {
  return apiRequest<ServerAppSettings>("/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function replaceSettings(settings: AppSettings | ServerAppSettings) {
  const payload = "browserNotificationsEnabled" in settings.ringtone
    ? toServerSettings(settings as AppSettings)
    : settings;

  return apiRequest<ServerAppSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function saveAiApiKey(apiKey: string) {
  return apiRequest<Pick<AiModelConfig, "hasApiKey">>("/settings/ai-key", {
    method: "PUT",
    body: JSON.stringify({ apiKey }),
  });
}

export function deleteAiApiKey() {
  return apiRequest<Pick<AiModelConfig, "hasApiKey">>("/settings/ai-key", {
    method: "DELETE",
  });
}
