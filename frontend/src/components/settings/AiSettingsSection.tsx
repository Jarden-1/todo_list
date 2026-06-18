import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, MessageSquareText, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_ASSISTANT_PROMPT,
  useSettings,
} from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { PRESET_MODELS } from "./settingsOptions";
import { SettingsCard } from "./SettingsCard";
import { SettingsToggleRow } from "./SettingsToggleRow";

export function AiSettingsSection() {
  const { settings, updateAiModel } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [model, setModel] = useState(settings.aiModel.model);
  const [apiKey, setApiKey] = useState(settings.aiModel.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.aiModel.baseUrl);
  const [assistantPrompt, setAssistantPrompt] = useState(settings.aiModel.assistantPrompt);

  useEffect(() => {
    setModel(settings.aiModel.model);
    setApiKey(settings.aiModel.apiKey);
    setBaseUrl(settings.aiModel.baseUrl);
    setAssistantPrompt(settings.aiModel.assistantPrompt);
  }, [
    settings.aiModel.apiKey,
    settings.aiModel.assistantPrompt,
    settings.aiModel.baseUrl,
    settings.aiModel.model,
  ]);

  const handleSaveAi = () => {
    updateAiModel({
      model: model.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      assistantPrompt: assistantPrompt.trim() || DEFAULT_ASSISTANT_PROMPT,
    });
    setSaved(true);
    toast.success("AI 配置已保存");
    window.setTimeout(() => setSaved(false), 1600);
  };

  const handleSavePrompt = () => {
    updateAiModel({ assistantPrompt: assistantPrompt.trim() || DEFAULT_ASSISTANT_PROMPT });
    setPromptOpen(false);
    toast.success("助手提示词已保存");
  };

  return (
    <>
      <SettingsCard
        title="AI 助手"
        description="用于一键整理、润色和补全待办内容"
        icon={Sparkles}
        iconClassName="brand-gradient text-white"
      >
        <SettingsToggleRow
          checked={settings.aiModel.enabled}
          onCheckedChange={(checked) => updateAiModel({ enabled: checked })}
          title={settings.aiModel.enabled ? "AI 助手已启用" : "AI 助手已关闭"}
          description={
            settings.aiModel.enabled
              ? "输入框里的 AI 整理和正文润色会使用下面的模型配置。"
              : "关闭后，输入框里的 AI 整理和正文润色会暂停使用。"
          }
          ariaLabel="切换 AI 助手"
        />

        {!settings.aiModel.enabled ? (
          <div className="mt-3 rounded-lg bg-muted/35 px-4 py-3 text-xs leading-6 text-muted-foreground">
            开启后可以配置模型、Base URL、API Key 和助手提示词。
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div>
                <label className="settings-label mb-1.5">模型</label>
                <input
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  list="smarttodo-ai-models"
                  placeholder="例如 gpt-4o-mini"
                  className="field-input"
                />
                <datalist id="smarttodo-ai-models">
                  {PRESET_MODELS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="settings-label mb-1.5">Base URL</label>
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="field-input"
                />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">配置只保存在本地浏览器。</p>
            </div>

            <div className="rounded-lg border border-border/45 bg-muted/35 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <MessageSquareText className="h-3.5 w-3.5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">助手提示词</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {settings.aiModel.assistantPrompt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAssistantPrompt(settings.aiModel.assistantPrompt);
                    setPromptOpen(true);
                  }}
                  className="flex-shrink-0 rounded-lg bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                >
                  编辑
                </button>
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
        )}
      </SettingsCard>

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>助手提示词</DialogTitle>
            <DialogDescription>
              这段提示词会作为 AI 整理和润色待办时的默认行为准则。
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={assistantPrompt}
            onChange={(event) => setAssistantPrompt(event.target.value)}
            className="field-input min-h-[280px] resize-y leading-6"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAssistantPrompt(DEFAULT_ASSISTANT_PROMPT)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              恢复默认
            </button>
            <button
              type="button"
              onClick={handleSavePrompt}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              保存提示词
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
