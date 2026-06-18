import { Bell, Play, Volume2, VolumeX } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";
import { ADVANCE_OPTIONS, RINGTONES } from "./settingsOptions";

export function ReminderSettingsSection() {
  const { settings, updateRingtone } = useSettings();

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
            <Bell className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">提醒</h2>
            <p className="text-[10px] text-muted-foreground">到期前发送本地提醒</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => updateRingtone({ enabled: !settings.ringtone.enabled })}
          className="field-input flex h-10 items-center justify-between gap-3 px-3 text-left"
          aria-label="切换提醒"
        >
          <span>
            <span className="block text-xs font-medium text-foreground">
              {settings.ringtone.enabled ? "提醒已开启" : "提醒已关闭"}
            </span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              {settings.ringtone.enabled ? "到期前会按下面的设置提醒" : "开启后再设置提前时间、铃声和音量"}
            </span>
          </span>
          <span
            className={cn(
              "relative h-[22px] w-10 flex-shrink-0 rounded-full transition-colors",
              settings.ringtone.enabled ? "bg-primary" : "bg-muted-foreground/20"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                settings.ringtone.enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </span>
        </button>

        {settings.ringtone.enabled && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[200px_minmax(0,1fr)]">
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RINGTONES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateRingtone({ sound: item.id })}
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
          </div>
        )}
      </div>
    </section>
  );
}
