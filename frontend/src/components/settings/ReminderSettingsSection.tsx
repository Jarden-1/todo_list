import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Loader2, Play, Volume2, VolumeX } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";
import { playNotificationSound } from "../../lib/notificationSound";
import {
  getApiErrorMessage,
  getBrowserNotificationPermission,
  getPushUnavailableReason,
  subscribeCurrentBrowserToPush,
  unsubscribeCurrentBrowserPush,
} from "../../lib/pushNotifications";
import { ADVANCE_OPTIONS, RINGTONES } from "./settingsOptions";
import { SettingsCard } from "./SettingsCard";
import { SettingsToggleRow } from "./SettingsToggleRow";
import { toast } from "sonner";

export function ReminderSettingsSection() {
  const { settings, updateRingtone } = useSettings();
  const [savingBrowserNotification, setSavingBrowserNotification] = useState(false);
  const [browserNotificationMessage, setBrowserNotificationMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );

  useEffect(() => {
    setNotificationPermission(getBrowserNotificationPermission());
  }, []);

  const handleSelectSound = (sound: string) => {
    const nextConfig = { ...settings.ringtone, sound };
    void updateRingtone({ sound }).catch((error) =>
      toast.error(error instanceof Error ? error.message : "铃声保存失败")
    );
    playNotificationSound(nextConfig);
  };

  const pushUnavailableReason = useMemo(() => getPushUnavailableReason(), []);

  const handleToggleBrowserNotification = async (checked: boolean) => {
    setSavingBrowserNotification(true);
    setBrowserNotificationMessage(null);

    try {
      if (checked) {
        const saved = await subscribeCurrentBrowserToPush();
        await updateRingtone({
          browserNotificationsEnabled: true,
          pushSubscriptionId: saved.subscription.id,
          pushEndpoint: saved.endpoint,
        });
        setNotificationPermission(getBrowserNotificationPermission());
        setBrowserNotificationMessage("浏览器通知已开启，后端提醒会通过 Web Push 发送到当前浏览器。");
        return;
      }

      await unsubscribeCurrentBrowserPush(
        settings.ringtone.pushEndpoint,
        settings.ringtone.pushSubscriptionId
      );
      await updateRingtone({
        browserNotificationsEnabled: false,
        pushSubscriptionId: undefined,
        pushEndpoint: undefined,
      });
      setNotificationPermission(getBrowserNotificationPermission());
      setBrowserNotificationMessage("浏览器通知已关闭，页面打开时仍可显示应用内提醒。");
    } catch (error) {
      setNotificationPermission(getBrowserNotificationPermission());
      setBrowserNotificationMessage(getApiErrorMessage(error));
      if (checked) {
        await updateRingtone({
          browserNotificationsEnabled: false,
          pushSubscriptionId: undefined,
          pushEndpoint: undefined,
        });
      }
    } finally {
      setSavingBrowserNotification(false);
    }
  };

  const desktopNotificationText =
    notificationPermission === "granted"
      ? "系统通知权限已允许"
      : notificationPermission === "denied"
        ? "系统通知权限已被拒绝"
        : notificationPermission === "default"
          ? "开启时会请求系统通知权限"
          : "当前浏览器不支持系统通知";

  return (
    <SettingsCard
      title="提醒"
      description="后端提醒事件、页面内弹窗、铃声和浏览器系统通知"
      icon={Bell}
      iconClassName="bg-amber-500/12 text-amber-500"
    >
      <div className="space-y-4">
        <SettingsToggleRow
          checked={settings.ringtone.enabled}
          onCheckedChange={(checked) => {
            void updateRingtone({ enabled: checked }).catch((error) =>
              toast.error(error instanceof Error ? error.message : "提醒设置保存失败")
            );
          }}
          title={settings.ringtone.enabled ? "到期提醒已开启" : "到期提醒已关闭"}
          description={
            settings.ringtone.enabled
              ? "页面打开时会拉取后端未读提醒，显示弹窗并播放提示音。"
              : "关闭后不拉取后端提醒，下面的提醒选项会自动收起。"
          }
          ariaLabel="切换到期提醒"
        />

        {settings.ringtone.enabled && (
          <div className="settings-subgrid">
            <div>
              <label className="settings-label mb-1.5">提前时间</label>
              <select
                value={settings.ringtone.advanceMinutes}
                onChange={(event) => {
                  void updateRingtone({ advanceMinutes: Number(event.target.value) }).catch((error) =>
                    toast.error(error instanceof Error ? error.message : "提醒时间保存失败")
                  );
                }}
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
                  onChange={(event) => {
                    void updateRingtone({ volume: Number(event.target.value) }).catch((error) =>
                      toast.error(error instanceof Error ? error.message : "音量保存失败")
                    );
                  }}
                  className="flex-1 accent-primary"
                />
                <span className="w-9 text-right text-xs text-muted-foreground">{settings.ringtone.volume}%</span>
              </div>
            </div>

            <div className="md:col-span-2 rounded-xl bg-muted/30 p-3 shadow-[inset_0_0_0_1px_oklch(from_var(--border)_l_c_h_/_22%)]">
              <SettingsToggleRow
                checked={settings.ringtone.browserNotificationsEnabled}
                onCheckedChange={handleToggleBrowserNotification}
                title="浏览器系统通知"
                description="浏览器关闭或页面不在前台时，由 Service Worker 接收 Web Push 并弹出系统通知。"
                ariaLabel="切换浏览器系统通知"
                disabled={
                  savingBrowserNotification ||
                  notificationPermission === "unsupported" ||
                  Boolean(pushUnavailableReason)
                }
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] leading-5 text-muted-foreground">
                {savingBrowserNotification && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    正在同步订阅
                  </span>
                )}
                {notificationPermission === "granted" && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    {desktopNotificationText}
                  </span>
                )}
                {notificationPermission !== "granted" && <span>{desktopNotificationText}</span>}
                {pushUnavailableReason && <span>{pushUnavailableReason}</span>}
                {browserNotificationMessage && (
                  <span
                    className={cn(
                      "basis-full",
                      browserNotificationMessage.includes("已开启")
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {browserNotificationMessage}
                  </span>
                )}
              </div>
              {settings.ringtone.browserNotificationsEnabled && settings.ringtone.pushSubscriptionId && (
                <p className="mt-2 truncate text-[10px] text-muted-foreground/80">
                  当前订阅：{settings.ringtone.pushSubscriptionId}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
