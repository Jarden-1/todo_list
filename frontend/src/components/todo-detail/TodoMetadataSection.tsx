import { useState, type RefObject } from "react";
import { AlertTriangle, Check, Edit3, User, X } from "lucide-react";
import { toast } from "sonner";
import type { DueAtPrecision, Project, Todo, TodoPriority } from "../../lib/types";
import { PRIORITY_OPTIONS } from "../../lib/todoOptions";
import { cn } from "../../lib/utils";
import { useTodo } from "../../contexts/TodoContext";
import { InlineDuePicker } from "./InlineDuePicker";

const NEW_PROJECT_VALUE = "__new_project__";

interface TodoMetadataSectionProps {
  todo: Todo;
  projects: Project[];
  assigneeValue: string;
  editingAssignee: boolean;
  dueAtRef: RefObject<HTMLInputElement | null>;
  overdue: boolean;
  onUpdate: (updates: Partial<Todo>) => void;
  onAssigneeValueChange: (value: string) => void;
  onEditingAssigneeChange: (editing: boolean) => void;
  onAssigneeSave: () => void;
  onOpenDuePicker: () => void;
  onPostpone: (days: number) => void;
}

export function TodoMetadataSection({
  todo,
  projects,
  assigneeValue,
  editingAssignee,
  dueAtRef,
  overdue,
  onUpdate,
  onAssigneeValueChange,
  onEditingAssigneeChange,
  onAssigneeSave,
  onOpenDuePicker,
  onPostpone,
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
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {/* Priority */}
        <div>
          <label className="detail-label">优先级</label>
          <select
            value={todo.priority}
            onChange={(event) => onUpdate({ priority: event.target.value as TodoPriority })}
            className="field-input mt-1"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div>
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

        {/* Project */}
        <div>
          <label className="detail-label">项目</label>
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
            <select
              value={todo.projectId ?? ""}
              onChange={(event) => handleProjectSelect(event.target.value)}
              className="field-input mt-1"
            >
              <option value="">未分配</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
              <option value={NEW_PROJECT_VALUE}>+ 新建项目…</option>
            </select>
          )}
        </div>

        {/* Due — inline 4-col picker, no separate precision row */}
        <div>
          <label className="detail-label">截止时间</label>
          <div className="mt-1">
            <InlineDuePicker
              dueAt={todo.dueAt}
              precision={precision}
              overdue={overdue}
              datetimeRef={dueAtRef}
              onOpenDatetimePicker={onOpenDuePicker}
              onChange={(next) => onUpdate(next)}
            />
          </div>
        </div>
      </div>

      {overdue && (
        <div className="mt-2">
          <p className="text-[10px] text-destructive flex items-center gap-1 mb-1.5">
            <AlertTriangle className="w-2.5 h-2.5" />
            已逾期 · 快速延期：
          </p>
          <div className="flex gap-1.5">
            {[{ label: "明天", days: 1 }, { label: "下周", days: 7 }, { label: "两周后", days: 14 }].map((option) => (
              <button
                key={option.label}
                onClick={() => onPostpone(option.days)}
                className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
