// SmartTodo - Smart Composer
// Two modes: "compose" (Markdown editor + AI) and "fields" (structured form)
import { useState, useRef, useEffect } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTodo } from "../contexts/TodoContext";
import { useAiOrganize } from "../hooks/useAiOrganize";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { MarkdownEditor } from "./MarkdownEditor";
import { stripEmbeddedImagesForAi } from "../lib/markdownImages";
import { appendEmbeddedImagesToAiResult } from "../lib/aiTodoResult";
import { CollapsedComposer } from "./composer/CollapsedComposer";
import { ComposerFullscreenDialog } from "./composer/ComposerFullscreenDialog";
import {
  ComposerModeSwitch,
  type ComposerMode,
} from "./composer/ComposerModeSwitch";
import { StructuredTodoForm } from "./composer/StructuredTodoForm";

interface AddTodoComposerProps {
  onTodoCreated?: (todoId: string) => void;
}

export function AddTodoComposer({ onTodoCreated }: AddTodoComposerProps) {
  const [mode, setMode] = useState<ComposerMode>("compose");
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fullscreenTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingAiOriginalInputRef = useRef<string | null>(null);
  const { addTodo, addTodoFromAi, undoLastAiCreate, projects } = useTodo();

  const { organize, loading: aiLoading } = useAiOrganize({
    onSuccess: (result, originalInput) => {
      const rawOriginalInput = pendingAiOriginalInputRef.current ?? originalInput;
      pendingAiOriginalInputRef.current = null;
      const resultWithImages = appendEmbeddedImagesToAiResult(result, rawOriginalInput);
      const todo = addTodoFromAi(resultWithImages, rawOriginalInput);
      setInput("");
      setExpanded(false);
      setFullscreen(false);
      onTodoCreated?.(todo.id);

      const warnings = result.warnings?.length ? result.warnings : null;
      toast.custom(
        (t) => (
          <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 shadow-2xl min-w-[300px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">已创建：{resultWithImages.title}</p>
              {warnings && (
                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {warnings[0]}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                const original = undoLastAiCreate();
                if (original) {
                  setInput(original);
                  setExpanded(true);
                  setFullscreen(false);
                  setMode("compose");
                  toast.dismiss(t);
                  toast.info("已撤销，原始输入已恢复");
                }
              }}
              className="text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap transition-colors"
            >
              撤销
            </button>
          </div>
        ),
        { duration: 8000 }
      );
    },
    onError: (err) => {
      pendingAiOriginalInputRef.current = null;
      toast.error(`AI 整理失败：${err}`);
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
  }, [input]);

  useEffect(() => {
    if (!fullscreen) return;
    setExpanded(true);
    setMode("compose");
    requestAnimationFrame(() => fullscreenTextareaRef.current?.focus());
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!expanded || fullscreen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (composerRef.current?.contains(target)) return;
      setExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expanded, fullscreen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    if (fullscreen) {
      setFullscreen(false);
      return;
    }
    setExpanded(false);
    setInput("");
  };

  const handleAiOrganize = async () => {
    const text = input.trim();
    if (!text) return;
    pendingAiOriginalInputRef.current = input;
    await organize(stripEmbeddedImagesForAi(text), {
      projects: projects.map((p) => p.name),
    });
  };

  const handleFieldsAdd = (fields: {
    title: string;
    priority: Parameters<typeof addTodo>[0]["priority"];
    dueAt?: string;
    projectId?: string;
    assignee?: string;
    contentMarkdown: string;
  }) => {
    const todo = addTodo({
      title: fields.title,
      priority: fields.priority,
      dueAt: fields.dueAt,
      projectId: fields.projectId,
      tagIds: [],
      assignee: fields.assignee,
      contentMarkdown: fields.contentMarkdown,
    });
    setExpanded(false);
    onTodoCreated?.(todo.id);
    toast.success(`已添加：${fields.title}`);
  };

  const hasComposeInput = input.trim().length > 0;
  const openFullscreen = () => {
    setExpanded(true);
    setMode("compose");
    setFullscreen(true);
  };
  const clearCompose = () => {
    setInput("");
    setFullscreen(false);
    setExpanded(false);
  };

  return (
    <div ref={composerRef} className="relative">
      <div
        className={cn(
          "smart-composer-card glass-card relative rounded-2xl transition-all duration-200",
          expanded
            ? "ring-1 ring-primary/30 shadow-lg shadow-primary/5"
            : ""
        )}
      >
        {/* Mode switch (only when expanded) */}
        {expanded && (
          <ComposerModeSwitch mode={mode} onModeChange={setMode} />
        )}

        {/* ===== COMPOSE MODE ===== */}
        {!expanded && (
          <CollapsedComposer
            value={input}
            textareaRef={textareaRef}
            hasInput={hasComposeInput}
            onChange={setInput}
            onExpand={() => setExpanded(true)}
            onClear={clearCompose}
            onOpenFullscreen={openFullscreen}
            onKeyDown={handleKeyDown}
          />
        )}

        {expanded && mode === "compose" && (
          <MarkdownEditor
            value={input}
            onChange={setInput}
            textareaRef={textareaRef}
            onKeyDown={handleKeyDown}
            placeholder="写下待办内容，支持 Markdown，或使用 AI 整理…"
            rows={4}
            rich
            toolbarMode="responsive"
            onAiOrganize={handleAiOrganize}
            aiLoading={aiLoading}
            aiDisabled={!hasComposeInput}
            showFullscreenToggle
            onToggleFullscreen={openFullscreen}
            fullscreenToggleLabel="全屏输入"
            resizableY
            defaultHeight={180}
            minHeight={150}
            maxHeight={420}
            toolbarClassName="absolute left-4 top-4 z-10 px-0 pt-0"
            textareaClassName="px-4 pb-6 pt-14 text-sm leading-relaxed"
          />
        )}

        {/* ===== FIELDS MODE ===== */}
        {expanded && mode === "fields" && (
          <StructuredTodoForm
            projects={projects}
            onCancel={() => setExpanded(false)}
            onAddTodo={handleFieldsAdd}
          />
        )}
      </div>

      {/* Hint */}
      {!expanded && (
        <p className="mt-1.5 text-[11px] text-muted-foreground px-1">
          点击输入 · 支持 Markdown · AI 自动整理
        </p>
      )}

      {fullscreen && (
        <ComposerFullscreenDialog
          value={input}
          textareaRef={fullscreenTextareaRef}
          hasInput={hasComposeInput}
          aiLoading={aiLoading}
          onChange={setInput}
          onClose={() => setFullscreen(false)}
          onKeyDown={handleKeyDown}
          onAiOrganize={handleAiOrganize}
        />
      )}
    </div>
  );
}
