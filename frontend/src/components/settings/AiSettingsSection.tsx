import { useEffect, useState } from "react";
import {
  Check,
  KeyRound,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
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
  const {
    settings,
    updateAiModel,
    saveAiApiKey,
    deleteAiApiKey,
  } = useSettings();
  const [promptOpen, setPromptOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [model, setModel] = useState(settings.aiModel.model);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(settings.aiModel.baseUrl);
  const [assistantPrompt, setAssistantPrompt] = useState(settings.aiModel.assistantPrompt);

  useEffect(() => {
    setModel(settings.aiModel.model);
    setBaseUrl(settings.aiModel.baseUrl);
    setAssistantPrompt(settings.aiModel.assistantPrompt);
  }, [
    settings.aiModel.assistantPrompt,
    settings.aiModel.baseUrl,
    settings.aiModel.model,
  ]);

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const handleSaveAi = async () => {
    try {
      await updateAiModel({
        model: model.trim(),
        baseUrl: baseUrl.trim(),
        assistantPrompt: assistantPrompt.trim() || DEFAULT_ASSISTANT_PROMPT,
      });
      flashSaved();
      toast.success("AI 配置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 配置保存失败");
    }
  };

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed || savingKey) return;

    setSavingKey(true);
    try {
      await saveAiApiKey(trimmed);
      setApiKey("");
      toast.success("API Key 已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "API Key 保存失败");
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteKey = async () => {
    try {
      await deleteAiApiKey();
      setApiKey("");
      toast.success("API Key 已清除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "API Key 清除失败");
    }
  };

  const handleSavePrompt = async () => {
    try {
      await updateAiModel({ assistantPrompt: assistantPrompt.trim() || DEFAULT_ASSISTANT_PROMPT });
      setPromptOpen(false);
      toast.success("助手提示词已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提示词保存失败");
    }
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
          onCheckedChange={(checked) => {
            void updateAiModel({ enabled: checked }).catch((error) =>
              toast.error(error instanceof Error ? error.message : "AI 助手设置保存失败")
            );
          }}
          title={settings.aiModel.enabled ? "AI 助手已启用" : "AI 助手已关闭"}
          description={
            settings.aiModel.enabled
              ? "输入框里的 AI 整理和正文润色会使用服务端保存的模型配置。"
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

            <div className="rounded-lg border border-border/45 bg-muted/25 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">API Key</p>
                    <p className="text-[11px] text-muted-foreground">
                      {settings.aiModel.hasApiKey ? "已保存 Key" : "未保存 Key"}
                    </p>
                  </div>
                </div>
                {settings.aiModel.hasApiKey && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteKey()}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    清除
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="输入新 API Key"
                  className="field-input flex-1"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveKey()}
                  disabled={!apiKey.trim() || savingKey}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {savingKey ? "保存中" : "保存 Key"}
                </button>
              </div>
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
                onClick={() => void handleSaveAi()}
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
              onClick={() => void handleSavePrompt()}
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
