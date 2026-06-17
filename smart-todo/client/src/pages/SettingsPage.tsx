// SmartTodo - Settings Page
// Sections: AI Model Config, Ringtone/Reminder, Appearance, Account
import { useState } from "react";
import { useLocation } from "wouter";
import { useSettings } from "../contexts/SettingsContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  ArrowLeft,
  Sparkles,
  Bell,
  User,
  Eye,
  EyeOff,
  Check,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const PRESET_RINGTONES = [
  { id: "chime", label: "清脆铃声" },
  { id: "bell", label: "经典铃铛" },
  { id: "soft", label: "柔和提示" },
  { id: "digital", label: "数字音效" },
  { id: "none", label: "静音" },
];

const PRESET_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "custom", label: "自定义模型" },
];

const ADVANCE_OPTIONS = [
  { value: 5, label: "5 分钟前" },
  { value: 15, label: "15 分钟前" },
  { value: 30, label: "30 分钟前" },
  { value: 60, label: "1 小时前" },
  { value: 1440, label: "1 天前" },
];

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { settings, updateAiModel, updateRingtone } = useSettings();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local AI state
  const [localModel, setLocalModel] = useState(settings.aiModel.model);
  const [localApiKey, setLocalApiKey] = useState(settings.aiModel.apiKey);
  const [localBaseUrl, setLocalBaseUrl] = useState(settings.aiModel.baseUrl);
  const [localMaxTokens, setLocalMaxTokens] = useState(settings.aiModel.maxTokens);
  const [localTemperature, setLocalTemperature] = useState(settings.aiModel.temperature);

  const handleSaveAI = () => {
    updateAiModel({
      model: localModel,
      apiKey: localApiKey,
      baseUrl: localBaseUrl,
      maxTokens: localMaxTokens,
      temperature: localTemperature,
    });
    setSaved(true);
    toast.success("AI 配置已保存");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-8 py-4 border-b border-border bg-background/95 backdrop-blur">
        <button
          onClick={() => navigate("/")}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-bold text-foreground font-display">设置</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">

        {/* ===== AI Model Section ===== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-foreground">AI 模型配置</h2>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-4">
            {/* Model selector */}
            <div>
              <label className="settings-label">模型</label>
              <select
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="field-input mt-1"
              >
                {PRESET_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Custom model name */}
            {localModel === "custom" && (
              <div>
                <label className="settings-label">自定义模型名称</label>
                <input
                  type="text"
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  placeholder="例如：gpt-4-vision-preview"
                  className="field-input mt-1"
                />
              </div>
            )}

            {/* API Key */}
            <div>
              <label className="settings-label">API Key</label>
              <div className="relative mt-1">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="field-input pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                API Key 仅存储在本地浏览器，不会上传至任何服务器
              </p>
            </div>

            {/* Base URL */}
            <div>
              <label className="settings-label">
                API Base URL{" "}
                <span className="text-muted-foreground/50 font-normal">（可选）</span>
              </label>
              <input
                type="text"
                value={localBaseUrl}
                onChange={(e) => setLocalBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="field-input mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                使用第三方代理或本地模型时填写
              </p>
            </div>

            {/* Advanced: Max Tokens + Temperature */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="settings-label">Max Tokens</label>
                <input
                  type="number"
                  value={localMaxTokens}
                  onChange={(e) => setLocalMaxTokens(Number(e.target.value))}
                  min={128}
                  max={8192}
                  step={128}
                  className="field-input mt-1"
                />
              </div>
              <div>
                <label className="settings-label">Temperature</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={localTemperature}
                    onChange={(e) => setLocalTemperature(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground w-6 text-right">
                    {localTemperature}
                  </span>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveAI}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
                  saved
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                )}
              >
                {saved ? (
                  <><Check className="w-3.5 h-3.5" />已保存</>
                ) : (
                  "保存配置"
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ===== Ringtone / Reminder Section ===== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <h2 className="text-sm font-bold text-foreground">提醒与铃声</h2>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-5">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">开启提醒</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">到期前发送系统通知</p>
              </div>
              <button
                onClick={() => updateRingtone({ enabled: !settings.ringtone.enabled })}
                className={cn(
                  "relative w-10 rounded-full transition-colors flex-shrink-0",
                  settings.ringtone.enabled ? "bg-primary" : "bg-muted"
                )}
                style={{ height: "22px" }}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    settings.ringtone.enabled ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            {settings.ringtone.enabled && (
              <>
                {/* Remind advance */}
                <div>
                  <label className="settings-label">提前提醒时间</label>
                  <select
                    value={settings.ringtone.advanceMinutes}
                    onChange={(e) => updateRingtone({ advanceMinutes: Number(e.target.value) })}
                    className="field-input mt-1"
                  >
                    {ADVANCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Ringtone selector */}
                <div>
                  <label className="settings-label">提醒铃声</label>
                  <div className="mt-2 space-y-1.5">
                    {PRESET_RINGTONES.map((rt) => (
                      <button
                        key={rt.id}
                        onClick={() => updateRingtone({ sound: rt.id })}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                          settings.ringtone.sound === rt.id
                            ? "bg-primary/10 text-primary border border-primary/25"
                            : "text-muted-foreground hover:bg-muted border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          settings.ringtone.sound === rt.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40"
                        )}>
                          {settings.ringtone.sound === rt.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="flex-1 text-left">{rt.label}</span>
                        {rt.id !== "none" ? (
                          <Play className="w-3 h-3 opacity-40" />
                        ) : (
                          <VolumeX className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <label className="settings-label flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3" />
                    音量
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ringtone.volume}
                      onChange={(e) => updateRingtone({ volume: Number(e.target.value) })}
                      className="flex-1 accent-primary"
                    />
                    <Volume2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {settings.ringtone.volume}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ===== Appearance Section ===== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Sun className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <h2 className="text-sm font-bold text-foreground">外观</h2>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">主题模式</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  当前：{theme === "dark" ? "深色模式" : "浅色模式"}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm text-foreground transition-colors"
              >
                {theme === "dark" ? (
                  <><Sun className="w-3.5 h-3.5" /> 切换浅色</>
                ) : (
                  <><Moon className="w-3.5 h-3.5" /> 切换深色</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ===== Account Section ===== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-bold text-foreground">账户</h2>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full brand-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.name.charAt(0) ?? "U"}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.name ?? "用户"}</p>
                <p className="text-[11px] text-muted-foreground">{user?.email ?? ""}</p>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="text-sm text-destructive hover:text-destructive/80 transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </section>

        <p className="text-center text-[10px] text-muted-foreground/40 pb-4">
          SmartTodo v2.0 · 纯前端演示版本
        </p>
      </div>
    </div>
  );
}
