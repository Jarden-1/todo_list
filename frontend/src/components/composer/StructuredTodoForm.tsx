import { Calendar, Check, Edit3, Flag, FolderOpen, Plus, User, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Project, TodoPriority } from "../../lib/types";
import { PRIORITY_OPTIONS } from "../../lib/todoOptions";
import { cn } from "../../lib/utils";
import { useTodo } from "../../contexts/TodoContext";
import { MarkdownEditor } from "../MarkdownEditor";

const NEW_PROJECT_VALUE = "__new_project__";

interface StructuredTodoFormProps {
  projects: Project[];
  onCancel: () => void;
  onAddTodo: (todo: {
    title: string;
    priority: TodoPriority;
    dueAt?: string;
    projectId?: string;
    assignee?: string;
    contentMarkdown: string;
  }) => void | Promise<void>;
}

export function StructuredTodoForm({ projects, onCancel, onAddTodo }: StructuredTodoFormProps) {
  const { addProject } = useTodo();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [dueAt, setDueAt] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const dueAtRef = useRef<HTMLInputElement>(null);

  const openDuePicker = () => {
    const input = dueAtRef.current;
    if (!input) return;
    input.focus();
    input.showPicker?.();
  };

  const handleProjectSelect = (value: string) => {
    if (value === NEW_PROJECT_VALUE) {
      setCreatingProject(true);
      setNewProjectName("");
      return;
    }
    setProjectId(value);
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
      setProjectId(project.id);
      setNewProjectName("");
      setCreatingProject(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "项目创建失败");
    } finally {
      setSavingProject(false);
    }
  };

  const reset = () => {
    setTitle("");
    setPriority("medium");
    setDueAt("");
    setProjectId("");
    setAssignee("");
    setNote("");
  };

  const handleAdd = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("请输入标题");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      await onAddTodo({
        title: trimmedTitle,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        projectId: projectId || undefined,
        assignee: assignee.trim() || undefined,
        contentMarkdown: note.trim(),
      });
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4 pt-14">
      <div>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleAdd();
            if (event.key === "Escape") onCancel();
          }}
          placeholder="待办标题 *"
          className="field-input text-sm font-medium"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
            <Flag className="w-3 h-3" /> 优先级
          </label>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TodoPriority)}
            className="field-input"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" /> 截止时间
          </label>
          <div
            role="button"
            tabIndex={0}
            onClick={openDuePicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDuePicker();
              }
            }}
          >
            <input
              ref={dueAtRef}
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              className="field-input cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
            <FolderOpen className="w-3 h-3" /> 项目
          </label>
          {creatingProject ? (
            <div className="flex items-center gap-1">
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
                className="field-input flex-1 min-w-0"
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
              value={projectId}
              onChange={(event) => handleProjectSelect(event.target.value)}
              className="field-input"
            >
              <option value="">未分配</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
              <option value={NEW_PROJECT_VALUE}>+ 新建项目…</option>
            </select>
          )}
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
            <User className="w-3 h-3" /> 对接人
          </label>
          <input
            type="text"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            placeholder="姓名 / 邮箱"
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
          <Edit3 className="w-3 h-3" /> 备注（支持 Markdown）
        </label>
        <MarkdownEditor
          value={note}
          onChange={setNote}
          placeholder="可选，支持 Markdown 格式…"
          rows={2}
          rich
          resizableY
          defaultHeight={110}
          minHeight={88}
          maxHeight={260}
          textareaClassName="px-2.5 py-2 pb-5 text-xs leading-relaxed"
          className="overflow-hidden rounded-lg border border-border/45 bg-muted/35 focus-within:border-primary/45"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleAdd}
          disabled={!title.trim() || saving}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold",
            "bg-primary text-primary-foreground",
            "hover:opacity-90 transition-opacity",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          {saving ? "添加中..." : "添加待办"}
        </button>
      </div>
    </div>
  );
}
