// SmartTodo - Todo Detail Panel
// Full editing panel: title, status, priority, due date, project, assignee, tags, subtasks, markdown
import { useState, useEffect, useRef } from "react";
import { Todo, TodoStatus, TodoPriority } from "../lib/types";
import { useTodo } from "../contexts/TodoContext";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime, isOverdue } from "../lib/dateUtils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X, Edit3, Check, Trash2, CheckCircle2, Plus,
  AlertTriangle, Sparkles, Eye, Code2, User,
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

interface TodoDetailPanelProps {
  todo: Todo;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: TodoPriority; label: string }[] = [
  { value: "urgent", label: "紧急" },
  { value: "high", label: "高" },
  { value: "medium", label: "普通" },
  { value: "low", label: "低" },
];

const STATUS_OPTIONS: { value: TodoStatus; label: string }[] = [
  { value: "todo", label: "待办" },
  { value: "doing", label: "进行中" },
  { value: "done", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

export function TodoDetailPanel({ todo, onClose }: TodoDetailPanelProps) {
  const {
    updateTodo, deleteTodo, completeTodo,
    projects, tags, toggleSubtask, addSubtask, deleteSubtask,
  } = useTodo();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(todo.title);
  const [markdownMode, setMarkdownMode] = useState<"preview" | "edit">("preview");
  const [markdownValue, setMarkdownValue] = useState(todo.contentMarkdown);
  const [newSubtask, setNewSubtask] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [assigneeValue, setAssigneeValue] = useState(todo.assignee ?? "");
  const [editingAssignee, setEditingAssignee] = useState(false);

  useEffect(() => {
    setTitleValue(todo.title);
    setMarkdownValue(todo.contentMarkdown);
    setAssigneeValue(todo.assignee ?? "");
  }, [todo.id]);

  const handleTitleSave = () => {
    if (titleValue.trim()) updateTodo(todo.id, { title: titleValue.trim() });
    setEditingTitle(false);
  };

  const handleMarkdownSave = () => {
    updateTodo(todo.id, { contentMarkdown: markdownValue });
    setMarkdownMode("preview");
  };

  const handleAssigneeSave = () => {
    updateTodo(todo.id, { assignee: assigneeValue.trim() || undefined });
    setEditingAssignee(false);
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      addSubtask(todo.id, newSubtask.trim());
      setNewSubtask("");
      setShowSubtaskInput(false);
    }
  };

  const handleDelete = () => {
    deleteTodo(todo.id);
    onClose();
    toast.success("待办已删除");
  };

  const handlePostpone = (days: number) => {
    const base = todo.dueAt ? new Date(todo.dueAt) : new Date();
    const newDate = new Date(base);
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(18, 0, 0, 0);
    updateTodo(todo.id, { dueAt: newDate.toISOString() });
    toast.success(`已延期至 ${newDate.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}`);
  };

  const overdue = isOverdue(todo.dueAt) && todo.status !== "done" && todo.status !== "cancelled";

  return (
    <div className="h-full flex flex-col bg-card border-l border-border panel-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <StatusBadge status={todo.status} size="md" />
          {todo.aiMeta?.aiGenerated && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-500 border border-violet-500/20">
              <Sparkles className="w-2.5 h-2.5" />
              AI 整理
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {todo.status !== "done" && todo.status !== "cancelled" && (
            <button
              onClick={() => { completeTodo(todo.id); toast.success("已完成！"); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
              title="标记完成"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Title */}
        <div>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") { setTitleValue(todo.title); setEditingTitle(false); }
                }}
                className="flex-1 field-input text-base font-semibold"
              />
              <button onClick={handleTitleSave} className="p-1.5 text-emerald-500 hover:text-emerald-400">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="group flex items-start gap-2 cursor-pointer" onClick={() => setEditingTitle(true)}>
              <h2 className="flex-1 text-base font-semibold text-foreground leading-snug">
                {todo.title}
              </h2>
              <Edit3 className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5 flex-shrink-0 transition-colors" />
            </div>
          )}
        </div>

        {/* AI warnings */}
        {todo.aiMeta?.warnings && todo.aiMeta.warnings.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              {todo.aiMeta.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{w}</p>
              ))}
            </div>
          </div>
        )}

        {/* Meta fields */}
        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div>
            <label className="detail-label">状态</label>
            <select
              value={todo.status}
              onChange={(e) => updateTodo(todo.id, { status: e.target.value as TodoStatus })}
              className="field-input mt-1"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="detail-label">优先级</label>
            <select
              value={todo.priority}
              onChange={(e) => updateTodo(todo.id, { priority: e.target.value as TodoPriority })}
              className="field-input mt-1"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div className="col-span-2">
            <label className="detail-label">截止时间</label>
            <input
              type="datetime-local"
              value={todo.dueAt ? todo.dueAt.slice(0, 16) : ""}
              onChange={(e) =>
                updateTodo(todo.id, {
                  dueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                })
              }
              className={cn("field-input mt-1", overdue && "border-destructive/50 text-destructive")}
            />
            {overdue && (
              <div className="mt-2">
                <p className="text-[10px] text-destructive flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  已逾期 · 快速延期：
                </p>
                <div className="flex gap-1.5">
                  {[{ label: "明天", days: 1 }, { label: "下周", days: 7 }, { label: "两周后", days: 14 }].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handlePostpone(opt.days)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Project */}
          <div className="col-span-2">
            <label className="detail-label">项目</label>
            <select
              value={todo.projectId ?? ""}
              onChange={(e) => updateTodo(todo.id, { projectId: e.target.value || undefined })}
              className="field-input mt-1"
            >
              <option value="">未分配</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="col-span-2">
            <label className="detail-label flex items-center gap-1">
              <User className="w-3 h-3" />
              对接人
            </label>
            {editingAssignee ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  autoFocus
                  type="text"
                  value={assigneeValue}
                  onChange={(e) => setAssigneeValue(e.target.value)}
                  onBlur={handleAssigneeSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAssigneeSave();
                    if (e.key === "Escape") { setAssigneeValue(todo.assignee ?? ""); setEditingAssignee(false); }
                  }}
                  placeholder="姓名 / 邮箱"
                  className="flex-1 field-input"
                />
                <button onClick={handleAssigneeSave} className="p-1.5 text-emerald-500">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="mt-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors group"
                onClick={() => setEditingAssignee(true)}
              >
                {todo.assignee ? (
                  <>
                    <div className="w-5 h-5 rounded-full brand-gradient flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {todo.assignee.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-xs text-foreground">{todo.assignee}</span>
                  </>
                ) : (
                  <span className="flex-1 text-xs text-muted-foreground italic">点击添加对接人…</span>
                )}
                <Edit3 className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="detail-label">标签</label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((tag) => {
              const isSelected = todo.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    const newTagIds = isSelected
                      ? todo.tagIds.filter((id) => id !== tag.id)
                      : [...todo.tagIds, tag.id];
                    updateTodo(todo.id, { tagIds: newTagIds });
                  }}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-full border transition-all",
                    isSelected
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-muted text-muted-foreground border-border hover:border-muted-foreground/40"
                  )}
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subtasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="detail-label">
              子任务{" "}
              {todo.subtasks.length > 0 && (
                <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                  ({todo.subtasks.filter((s) => s.done).length}/{todo.subtasks.length})
                </span>
              )}
            </label>
            <button
              onClick={() => setShowSubtaskInput(true)}
              className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
            >
              <Plus className="w-3 h-3" />
              添加
            </button>
          </div>

          {todo.subtasks.length > 0 && (
            <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden">
              <div
                className="h-full brand-gradient rounded-full transition-all"
                style={{
                  width: `${(todo.subtasks.filter((s) => s.done).length / todo.subtasks.length) * 100}%`,
                }}
              />
            </div>
          )}

          <div className="space-y-1.5">
            {todo.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggleSubtask(todo.id, subtask.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors"
                >
                  {subtask.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-muted-foreground/40 hover:border-emerald-500 transition-colors" />
                  )}
                </button>
                <span className={cn("flex-1 text-xs", subtask.done ? "line-through text-muted-foreground/50" : "text-foreground")}>
                  {subtask.title}
                </span>
                <button
                  onClick={() => deleteSubtask(todo.id, subtask.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {showSubtaskInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                autoFocus
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubtask();
                  if (e.key === "Escape") { setShowSubtaskInput(false); setNewSubtask(""); }
                }}
                onBlur={() => { if (!newSubtask.trim()) setShowSubtaskInput(false); }}
                placeholder="子任务标题…"
                className="flex-1 field-input"
              />
              <button onClick={handleAddSubtask} className="text-emerald-500 hover:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Markdown content */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="detail-label">正文</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMarkdownMode("preview")}
                className={cn(
                  "p-1 rounded text-[10px] flex items-center gap-1 transition-colors",
                  markdownMode === "preview" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="w-3 h-3" />
                预览
              </button>
              <button
                onClick={() => setMarkdownMode("edit")}
                className={cn(
                  "p-1 rounded text-[10px] flex items-center gap-1 transition-colors",
                  markdownMode === "edit" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Code2 className="w-3 h-3" />
                编辑
              </button>
            </div>
          </div>

          {markdownMode === "preview" ? (
            <div
              className="markdown-body text-xs min-h-[80px] cursor-pointer"
              onClick={() => setMarkdownMode("edit")}
            >
              {markdownValue ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownValue}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground/40 italic">点击添加正文内容…</p>
              )}
            </div>
          ) : (
            <div>
              <textarea
                autoFocus
                value={markdownValue}
                onChange={(e) => setMarkdownValue(e.target.value)}
                placeholder="支持 Markdown 格式…"
                rows={10}
                className="field-input resize-none font-mono leading-relaxed"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setMarkdownValue(todo.contentMarkdown); setMarkdownMode("preview"); }}
                  className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleMarkdownSave}
                  className="text-xs text-primary hover:text-primary/80 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Meta */}
        {todo.aiMeta?.aiGenerated && (
          <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/15">
            <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-2">
              AI 元信息
            </p>
            <div className="space-y-1">
              {todo.originalInput && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">原始输入</p>
                  <p className="text-[11px] text-muted-foreground/70 italic leading-relaxed">
                    "{todo.originalInput}"
                  </p>
                </div>
              )}
              {todo.aiMeta.confidence && (
                <div className="flex gap-3 mt-2">
                  {Object.entries(todo.aiMeta.confidence).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-[9px] text-muted-foreground/50">{key}</p>
                      <p className={cn(
                        "text-[10px] font-medium",
                        val === "high" ? "text-emerald-500" : val === "medium" ? "text-amber-500" : "text-destructive"
                      )}>
                        {val === "high" ? "高" : val === "medium" ? "中" : "低"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-2 border-t border-border space-y-1">
          <p className="text-[10px] text-muted-foreground/50">
            创建于 {formatDateTime(todo.createdAt)}
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            更新于 {formatDateTime(todo.updatedAt)}
          </p>
          {todo.completedAt && (
            <p className="text-[10px] text-emerald-500/70">
              完成于 {formatDateTime(todo.completedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
