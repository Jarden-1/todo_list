// SmartTodo - Smart Composer
// Two modes: "compose" (Markdown editor + AI) and "fields" (structured form)
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Sparkles,
  Plus,
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  List,
  Edit3,
  Link2,
  Calendar,
  Tag,
  FolderOpen,
  User,
  Flag,
} from "lucide-react";
import { useTodo } from "../contexts/TodoContext";
import { useAiOrganize } from "../hooks/useAiOrganize";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { TodoPriority } from "../lib/types";

interface AddTodoComposerProps {
  onTodoCreated?: (todoId: string) => void;
}

type ComposerMode = "compose" | "fields";

const PRIORITY_OPTIONS: Array<{ value: TodoPriority; label: string; color: string }> = [
  { value: "urgent", label: "紧急", color: "text-red-500" },
  { value: "high", label: "高", color: "text-amber-500" },
  { value: "medium", label: "普通", color: "text-primary" },
  { value: "low", label: "低", color: "text-muted-foreground" },
];

export function AddTodoComposer({ onTodoCreated }: AddTodoComposerProps) {
  const [mode, setMode] = useState<ComposerMode>("compose");
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addTodo, addTodoFromAi, undoLastAiCreate, projects, tags } = useTodo();

  // Fields mode state
  const [fieldTitle, setFieldTitle] = useState("");
  const [fieldPriority, setFieldPriority] = useState<TodoPriority>("medium");
  const [fieldDueAt, setFieldDueAt] = useState("");
  const [fieldProjectId, setFieldProjectId] = useState("");
  const [fieldAssignee, setFieldAssignee] = useState("");
  const [fieldTagIds, setFieldTagIds] = useState<string[]>([]);
  const [fieldNote, setFieldNote] = useState("");

  const { organize, loading: aiLoading } = useAiOrganize({
    onSuccess: (result, originalInput) => {
      const todo = addTodoFromAi(result, originalInput);
      setInput("");
      setExpanded(false);
      onTodoCreated?.(todo.id);

      const warnings = result.warnings?.length ? result.warnings : null;
      toast.custom(
        (t) => (
          <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 shadow-2xl min-w-[300px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">已创建：{result.title}</p>
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
    onError: (err) => toast.error(`AI 整理失败：${err}`),
  });

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") { setExpanded(false); setInput(""); }
  };

  const handleAiOrganize = async () => {
    const text = input.trim();
    if (!text) return;
    await organize(text, {
      projects: projects.map((p) => p.name),
      tags: tags.map((t) => t.name),
    });
  };

  const handleFieldsAdd = () => {
    const title = fieldTitle.trim();
    if (!title) { toast.error("请输入标题"); return; }
    const todo = addTodo({
      title,
      priority: fieldPriority,
      dueAt: fieldDueAt ? new Date(fieldDueAt).toISOString() : undefined,
      projectId: fieldProjectId || undefined,
      tagIds: fieldTagIds,
      assignee: fieldAssignee.trim() || undefined,
      contentMarkdown: fieldNote.trim(),
    });
    // Reset
    setFieldTitle("");
    setFieldPriority("medium");
    setFieldDueAt("");
    setFieldProjectId("");
    setFieldAssignee("");
    setFieldTagIds([]);
    setFieldNote("");
    setExpanded(false);
    onTodoCreated?.(todo.id);
    toast.success(`已添加：${title}`);
  };

  const hasComposeInput = input.trim().length > 0;

  const toggleTag = (tagId: string) => {
    setFieldTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "glass-card rounded-2xl transition-all duration-200",
          expanded
            ? "ring-1 ring-primary/30 shadow-lg shadow-primary/5"
            : ""
        )}
      >
        {/* Mode tabs (only when expanded) */}
        {expanded && (
          <div className="flex items-center gap-1 px-4 pt-3 pb-0">
            <button
              onClick={() => setMode("compose")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                mode === "compose"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Edit3 className="w-3.5 h-3.5" />
              智能编辑
            </button>
            <button
              onClick={() => setMode("fields")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                mode === "fields"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <List className="w-3.5 h-3.5" />
              分字段添加
            </button>
          </div>
        )}

        {/* ===== COMPOSE MODE ===== */}
        {(!expanded || mode === "compose") && (
          <>
            <div className="flex items-start gap-3 p-4">
              <div className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (!expanded && e.target.value) setExpanded(true);
                }}
                onFocus={() => setExpanded(true)}
                onKeyDown={handleKeyDown}
                placeholder="写下待办内容，支持 Markdown，或使用 AI 整理…"
                rows={expanded ? 4 : 1}
                className={cn(
                  "flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground",
                  "resize-none outline-none leading-relaxed",
                  "min-h-[24px]"
                )}
              />
              {hasComposeInput && (
                <button
                  onClick={() => { setInput(""); setExpanded(false); }}
                  className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Compose action bar */}
            {expanded && (
              <div className="flex items-center justify-between px-4 pb-3 gap-3 border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMode("fields")}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <List className="w-3 h-3" />
                    分字段填写
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAiOrganize}
                    disabled={!hasComposeInput || aiLoading}
                    className={cn(
                      "ai-btn flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold",
                      aiLoading && "ai-btn-loading"
                    )}
                  >
                    {aiLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spinner" />
                        整理中…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        AI 整理
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== FIELDS MODE ===== */}
        {expanded && mode === "fields" && (
          <div className="p-4 space-y-3">
            {/* Title */}
            <div>
              <input
                autoFocus
                type="text"
                value={fieldTitle}
                onChange={(e) => setFieldTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleFieldsAdd(); if (e.key === "Escape") { setExpanded(false); } }}
                placeholder="待办标题 *"
                className="field-input text-sm font-medium"
              />
            </div>

            {/* Row: Priority + Due date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Flag className="w-3 h-3" /> 优先级
                </label>
                <select
                  value={fieldPriority}
                  onChange={(e) => setFieldPriority(e.target.value as TodoPriority)}
                  className="field-input"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3" /> 截止时间
                </label>
                <input
                  type="datetime-local"
                  value={fieldDueAt}
                  onChange={(e) => setFieldDueAt(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            {/* Row: Project + Assignee */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                  <FolderOpen className="w-3 h-3" /> 项目
                </label>
                <select
                  value={fieldProjectId}
                  onChange={(e) => setFieldProjectId(e.target.value)}
                  className="field-input"
                >
                  <option value="">未分配</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                  <User className="w-3 h-3" /> 对接人
                </label>
                <input
                  type="text"
                  value={fieldAssignee}
                  onChange={(e) => setFieldAssignee(e.target.value)}
                  placeholder="姓名 / 邮箱"
                  className="field-input"
                />
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Tag className="w-3 h-3" /> 标签
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-full border transition-all",
                        fieldTagIds.includes(tag.id)
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-muted text-muted-foreground border-border hover:border-border/80"
                      )}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                <Edit3 className="w-3 h-3" /> 备注（支持 Markdown）
              </label>
              <textarea
                value={fieldNote}
                onChange={(e) => setFieldNote(e.target.value)}
                placeholder="可选，支持 Markdown 格式…"
                rows={2}
                className="field-input resize-none leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { setExpanded(false); }}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleFieldsAdd}
                disabled={!fieldTitle.trim()}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 transition-opacity",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                添加待办
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      {!expanded && (
        <p className="mt-1.5 text-[11px] text-muted-foreground px-1">
          点击输入 · AI 整理自动结构化 · 或切换分字段填写
        </p>
      )}
    </div>
  );
}
