import { useEffect, useState } from "react";
import { Bell, Check, Play, Volume2, VolumeX } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";
import { playNotificationSound } from "../../lib/notificationSound";
import {
  canUseSystemNotifications,
  ensureNotificationPermission,
} from "../../lib/reminderScheduler";
import { ADVANCE_OPTIONS, RINGTONES } from "./settingsOptions";
import { SettingsCard } from "./SettingsCard";
import { SettingsToggleRow } from "./SettingsToggleRow";

export function ReminderSettingsSection() {
  const { settings, updateRingtone } = useSettings();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );

  useEffect(() => {
    if (!canUseSystemNotifications()) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  const handleSelectSound = (sound: string) => {
    const nextConfig = { ...settings.ringtone, sound };
    updateRingtone({ sound });
    playNotificationSound(nextConfig);
  };

  const handleEnableDesktopNotification = async () => {
    const permission = await ensureNotificationPermission();
    setNotificationPermission(permission);
  };

  const desktopNotificationText = {
    granted: "桌面通知已开启",
    denied: "浏览器已拒绝桌面通知",
    default: "开启桌面通知",
    unsupported: "当前浏览器不支持桌面通知",
  }[notificationPermission];

  return (
    <SettingsCard
      title="提醒"
      description="浏览器打开时播放铃声并弹出提醒"
      icon={Bell}
      iconClassName="bg-amber-500/12 text-amber-500"
    >
      <div className="space-y-4">
        <SettingsToggleRow
          checked={settings.ringtone.enabled}
          onCheckedChange={(checked) => updateRingtone({ enabled: checked })}
          title={settings.ringtone.enabled ? "到期提醒已开启" : "到期提醒已关闭"}
          description={
            settings.ringtone.enabled
              ? "有截止时间的待办，会按下面的提前时间播放铃声并弹出页面提醒。"
              : "关闭后不会发送到期提醒，下面的提醒选项会自动收起。"
          }
          ariaLabel="切换到期提醒"
        />

        {settings.ringtone.enabled && (
          <div className="settings-subgrid">
            <div>
              <label className="settings-label mb-1.5">提前时间</label>
              <select
                value={settings.ringtone.advanceMinutes}
                onChange={(event) => updateRingtone({ advanceMinutes: Number(event.target.value) })}
                className="field-input"
              >
                {ADVANCE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="settings-label mb-1.5">铃声</label>
              <p className="mb-2 text-[11px] text-muted-foreground">点击即可选择并试听</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RINGTONES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSound(item.id)}
                    className={cn(
                      "flex min-h-9 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                      settings.ringtone.sound === item.id
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border/45 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.id === "none" ? (
                      <VolumeX className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <Play className="h-3 w-3 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="settings-label mb-1.5 flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                音量
              </label>
              <div className="flex items-center gap-3">
                <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.ringtone.volume}
                  onChange={(event) => updateRingtone({ volume: Number(event.target.value) })}
                  className="flex-1 accent-primary"
                />
                <span className="w-9 text-right text-xs text-muted-foreground">{settings.ringtone.volume}%</span>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">桌面通知</p>
                <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                  浏览器允许后，SmartTodo 会在系统通知里同步提醒。
                </p>
              </div>
              <button
                type="button"
                onClick={handleEnableDesktopNotification}
                disabled={notificationPermission === "granted" || notificationPermission === "unsupported"}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                  notificationPermission === "granted"
                    ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                    : "bg-background text-foreground shadow-sm hover:bg-muted",
                  notificationPermission === "unsupported" && "cursor-not-allowed opacity-60"
                )}
              >
                {notificationPermission === "granted" && <Check className="h-3.5 w-3.5" />}
                {desktopNotificationText}
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
