// SmartTodo - Smart Composer
// Two modes: "compose" (Markdown editor + AI) and "fields" (structured form)
import { useState, useRef, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTodo } from "../contexts/TodoContext";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { MarkdownEditor } from "./MarkdownEditor";
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
  const [aiLoading, setAiLoading] = useState(false);
  const { addTodo, addTodoFromAi, undoLastAiCreate, projects } = useTodo();

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
    if (!text || aiLoading) return;

    setAiLoading(true);
    try {
      const todo = await addTodoFromAi(input);
      setInput("");
      setExpanded(false);
      setFullscreen(false);
      onTodoCreated?.(todo.id);

      toast.custom(
        (t) => (
          <div className="flex min-w-[300px] items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-2xl">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">已创建：{todo.title}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void undoLastAiCreate()
                  .then((original) => {
                    if (!original) return;
                    setInput(original);
                    setExpanded(true);
                    setFullscreen(false);
                    setMode("compose");
                    toast.dismiss(t);
                    toast.info("已撤销，原始输入已恢复");
                  })
                  .catch(() => toast.error("撤销失败，请稍后重试"));
              }}
              className="whitespace-nowrap text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              撤销
            </button>
          </div>
        ),
        { duration: 8000 }
      );
    } catch (error) {
      toast.error(error instanceof Error ? `AI 整理失败：${error.message}` : "AI 整理失败");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFieldsAdd = async (fields: {
    title: string;
    priority: Parameters<typeof addTodo>[0]["priority"];
    dueAt?: string;
    projectId?: string;
    assignee?: string;
    contentMarkdown: string;
  }) => {
    try {
      const todo = await addTodo({
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败，请稍后重试");
      throw error;
    }
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
            toolbarClassName="px-4 pt-4"
            textareaClassName="px-4 pb-6 pt-3 text-sm leading-relaxed"
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
