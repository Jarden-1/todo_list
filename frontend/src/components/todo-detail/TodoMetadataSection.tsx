import { useState } from "react";
import { Calendar, Check, Edit3, Flag, Folder, User, X } from "lucide-react";
import { toast } from "sonner";
import type { DueAtPrecision, Project, Todo, TodoPriority } from "../../lib/types";
import { PRIORITY_OPTIONS } from "../../lib/todoOptions";
import { cn } from "../../lib/utils";
import { useTodo } from "../../contexts/TodoContext";
import { DuePrecisionPicker } from "./DuePrecisionPicker";
import { toDatetimeLocalValue } from "../../lib/todoDueReminder";

const NEW_PROJECT_VALUE = "__new_project__";

// 2x2 metadata grid for the detail panel. Layout matches the reference
// design: 优先级 / 对接人 / 项目 / 截止时间 in a 2-column grid; due-time
// gets a "label | value" two-segment summary plus the 4-tab precision
// editor (精确时刻 / 某天 / 本周内 / 无) underneath. Clicking any
// precision tab lands directly on the self-drawn DateTimePicker in one
// step — no more "click tab → see plain date grid → click again to add
// time" two-step dance.

// Priority dot colour per value — mirrors PRIORITY_OPTIONS' text colour
// but as a background fill (small 8px circle in the badge).
const PRIORITY_DOT: Record<TodoPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-primary",
  low: "bg-muted-foreground/60",
};

interface TodoMetadataSectionProps {
  todo: Todo;
  projects: Project[];
  assigneeValue: string;
  editingAssignee: boolean;
  overdue: boolean;
  onUpdate: (updates: Partial<Todo>) => void;
  onAssigneeValueChange: (value: string) => void;
  onEditingAssigneeChange: (editing: boolean) => void;
  onAssigneeSave: () => void;
}

export function TodoMetadataSection({
  todo,
  projects,
  assigneeValue,
  editingAssignee,
  overdue,
  onUpdate,
  onAssigneeValueChange,
  onEditingAssigneeChange,
  onAssigneeSave,
}: TodoMetadataSectionProps) {
  const { addProject } = useTodo();
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  const handleProjectSelect = (value: string) => {
    if (value === NEW_PROJECT_VALUE) {
      setCreatingProject(true);
      setNewProjectName("");
      return;
    }
    onUpdate({ projectId: value || null });
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) {
      setCreatingProject(false);
      return;
    }
    if (savingProject) return;
    setSavingProject(true);
    try {
      const project = await addProject(name);
      onUpdate({ projectId: project.id });
      setNewProjectName("");
      setCreatingProject(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "项目创建失败");
    } finally {
      setSavingProject(false);
    }
  };

  const precision: DueAtPrecision =
    todo.dueAtPrecision ?? (todo.dueAt ? "datetime" : "none");

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {/* Priority — dot badge + inline select */}
      <div>
        <label className="detail-label flex items-center gap-1">
          <Flag className="w-3 h-3" />
          优先级
        </label>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
          <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", PRIORITY_DOT[todo.priority])} aria-hidden />
          <select
            value={todo.priority}
            onChange={(event) => onUpdate({ priority: event.target.value as TodoPriority })}
            className="flex-1 bg-transparent text-xs text-foreground outline-none cursor-pointer"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignee — avatar chip (click to edit) */}
      <div>
        <label className="detail-label flex items-center gap-1">
          <User className="w-3 h-3" />
          对接人
        </label>
        {editingAssignee ? (
          <div className="mt-1 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={assigneeValue}
              onChange={(event) => onAssigneeValueChange(event.target.value)}
              onBlur={onAssigneeSave}
              onKeyDown={(event) => {
                if (event.key === "Enter") onAssigneeSave();
                if (event.key === "Escape") {
                  onAssigneeValueChange(todo.assignee ?? "");
                  onEditingAssigneeChange(false);
                }
              }}
              placeholder="姓名 / 邮箱"
              className="flex-1 field-input"
            />
            <button onClick={onAssigneeSave} className="p-1.5 text-emerald-500">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            className="mt-1 flex min-h-[31px] items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors group"
            onClick={() => onEditingAssigneeChange(true)}
          >
            {todo.assignee ? (
              <>
                <div className="w-5 h-5 rounded-full brand-gradient flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                  {todo.assignee.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-xs text-foreground truncate">{todo.assignee}</span>
              </>
            ) : (
              <span className="flex-1 text-xs text-muted-foreground italic truncate">点击添加对接人…</span>
            )}
            <Edit3 className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
        )}
      </div>

      {/* Project — folder icon + inline select / new-project input */}
      <div>
        <label className="detail-label flex items-center gap-1">
          <Folder className="w-3 h-3" />
          项目
        </label>
        {creatingProject ? (
          <div className="mt-1 flex items-center gap-1">
            <input
              autoFocus
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreateProject();
                }
                if (event.key === "Escape") {
                  setCreatingProject(false);
                  setNewProjectName("");
                }
              }}
              placeholder="新项目名称…"
              className="field-input min-w-0 flex-1"
            />
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                void handleCreateProject();
              }}
              disabled={savingProject}
              className="flex-shrink-0 p-1 text-emerald-500 hover:text-emerald-400 disabled:opacity-40"
              aria-label="确认新建项目"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                setCreatingProject(false);
                setNewProjectName("");
              }}
              className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground"
              aria-label="取消新建项目"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
            <Folder className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" aria-hidden />
            <select
              value={todo.projectId ?? ""}
              onChange={(event) => handleProjectSelect(event.target.value)}
              className="flex-1 bg-transparent text-xs text-foreground outline-none cursor-pointer"
            >
              <option value="">未分配</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
              <option value={NEW_PROJECT_VALUE}>+ 新建项目…</option>
            </select>
          </div>
        )}
      </div>

      {/* Due — "precision | value" summary + 4-tab precision editor below */}
      <div>
        <label className="detail-label flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          截止时间
        </label>
        <div
          className={cn(
            "mt-1 flex min-h-[31px] items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5",
            overdue && "border-destructive/50"
          )}
        >
          <span
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              overdue
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/40 bg-primary/10 text-primary"
            )}
          >
            {precisionLabel(precision)}
          </span>
          <span className="text-[10px] text-muted-foreground/60">|</span>
          <span
            className={cn(
              "flex-1 truncate text-xs tabular-nums",
              overdue ? "text-destructive" : "text-foreground"
            )}
          >
            {formatDueValue(precision, todo.dueAt)}
          </span>
        </div>
        <div className="mt-1.5">
          <DuePrecisionPicker
            dueAt={todo.dueAt}
            precision={precision}
            overdue={overdue}
            onChange={(next) => onUpdate(next)}
          />
        </div>
      </div>
    </div>
  );
}

// Human label for the precision summary chip in the two-segment display.
function precisionLabel(precision: DueAtPrecision): string {
  switch (precision) {
    case "datetime":
      return "精确时刻";
    case "day":
      return "某天";
    case "week":
      return "本周内";
    case "none":
      return "无";
  }
}

// Renders the value side of the "精度 | 值" summary. Mirrors the same
// formatting the inline picker used so behaviour is consistent.
function formatDueValue(precision: DueAtPrecision, dueAt: string | null | undefined): string {
  if (!dueAt) return "未设置";
  if (precision === "week") return "本周内";
  const local = toDatetimeLocalValue(dueAt); // "YYYY-MM-DDTHH:mm"
  if (!local) return "未设置";
  if (precision === "day") return local.slice(0, 10).replace(/-/g, "/");
  // datetime — keep the date, drop the seconds
  const [date, time] = local.split("T");
  return `${date.replace(/-/g, "/")} ${time}`;
}
