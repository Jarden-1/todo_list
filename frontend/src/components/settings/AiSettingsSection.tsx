import { useState } from "react";
import { Check, Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";
import { PRESET_MODELS } from "./settingsOptions";

export function AiSettingsSection() {
  const { settings, updateAiModel } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [model, setModel] = useState(settings.aiModel.model);
  const [apiKey, setApiKey] = useState(settings.aiModel.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.aiModel.baseUrl);
  const [maxTokens, setMaxTokens] = useState(settings.aiModel.maxTokens);
  const [temperature, setTemperature] = useState(settings.aiModel.temperature);

  const handleSaveAi = () => {
    updateAiModel({ model, apiKey, baseUrl, maxTokens, temperature });
    setSaved(true);
    toast.success("AI 配置已保存");
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg brand-gradient">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">AI 配置</h2>
          <p className="text-[10px] text-muted-foreground">用于一键整理待办内容</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="settings-label mb-1.5">模型</label>
            <select value={model} onChange={(event) => setModel(event.target.value)} className="field-input">
              {PRESET_MODELS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="settings-label mb-1.5">Base URL</label>
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="field-input" />
          </div>
        </div>

        <div>
          <label className="settings-label mb-1.5">API Key</label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
              className="field-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">配置只保存在本地浏览器。</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,180px)_1fr]">
          <div>
            <label className="settings-label mb-1.5">Max Tokens</label>
            <input
              type="number"
              min={128}
              max={8192}
              step={128}
              value={maxTokens}
              onChange={(event) => setMaxTokens(Number(event.target.value))}
              className="field-input"
            />
          </div>
          <div>
            <label className="settings-label mb-1.5">Temperature</label>
            <div className="flex h-9 items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="w-8 text-right text-xs text-muted-foreground">{temperature}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSaveAi}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              saved ? "bg-emerald-500/15 text-emerald-600" : "bg-primary text-primary-foreground hover:opacity-90"
            )}
          >
            {saved && <Check className="h-3.5 w-3.5" />}
            {saved ? "已保存" : "保存配置"}
          </button>
        </div>
      </div>
    </section>
  );
}
