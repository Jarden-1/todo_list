import { Type } from "lucide-react";
import {
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
  useTheme,
} from "../../contexts/ThemeContext";
import { SettingsCard } from "./SettingsCard";

const PRESETS: Array<{ label: string; scale: number }> = [
  { label: "小", scale: 0.875 },
  { label: "标准", scale: 1 },
  { label: "大", scale: 1.125 },
  { label: "特大", scale: 1.25 },
];

export function AppearanceSettingsSection() {
  const { fontScale, setFontScale } = useTheme();
  const percent = Math.round(fontScale * 100);

  return (
    <SettingsCard
      title="外观与字体"
      description="调整全局字体大小，立即生效并保存在本机"
      icon={Type}
      iconClassName="bg-indigo-500/12 text-indigo-500"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">字体大小</span>
          <span className="rounded-md bg-muted/50 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {percent}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">A</span>
          <input
            type="range"
            min={MIN_FONT_SCALE}
            max={MAX_FONT_SCALE}
            step={0.01}
            value={fontScale}
            onChange={(event) => setFontScale(Number(event.target.value))}
            aria-label="字体大小"
            className="font-scale-slider h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-[var(--brand-from)]"
          />
          <span className="text-lg text-muted-foreground">A</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = Math.abs(fontScale - preset.scale) < 0.005;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setFontScale(preset.scale)}
                className={
                  "rounded-lg border px-3 py-1.5 text-xs transition-colors " +
                  (active
                    ? "border-primary/50 bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground")
                }
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
          <p className="text-sm text-foreground">预览：这是一段示例文字 Aa 123</p>
          <p className="mt-1 text-xs text-muted-foreground">
            字体大小会作用于整个应用界面。
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}
