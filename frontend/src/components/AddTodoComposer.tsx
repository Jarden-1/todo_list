// SmartTodo - Smart Composer
// Simplified: single Markdown input + 5 lightweight field buttons + fullscreen/AI
import { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  Edit3,
  Flag,
  FolderOpen,
  Plus,
  Trash2,
  Undo2,
  User,
  X,
} from "lucide-react";
import { useTodo } from "../contexts/TodoContext";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { MarkdownEditor } from "./MarkdownEditor";
import { ComposerFullscreenDialog } from "./composer/ComposerFullscreenDialog";
import { FieldPopover } from "./composer/FieldPopover";
import { DuePrecisionPicker } from "./todo-detail/DuePrecisionPicker";
import { ProjectDeleteDialog } from "./ProjectDeleteDialog";
import { PRIORITY_OPTIONS } from "../lib/todoOptions";
import type { DueAtPrecision, Project, TodoPriority } from "../lib/types";

const RECENT_ASSIGNEES_KEY = "smarttodo.recentAssignees";
const MAX_RECENT_ASSIGNEES = 10;
const NEW_PROJECT_VALUE = "__new_project__";

function loadRecentAssignees(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_ASSIGNEES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function persistRecentAssignees(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_ASSIGNEES_KEY,
      JSON.stringify(list.slice(0, MAX_RECENT_ASSIGNEES))
    );
  } catch {
    // ignore quota / serialization errors
  }
}

type FieldKey = "assignee" | "project" | "priority" | "due" | "description";

interface AddTodoComposerProps {
  onTodoCreated?: (todoId: string) => void;
}

export function AddTodoComposer({ onTodoCreated }: AddTodoComposerProps) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fullscreenTextareaRef = useRef<HTMLTextAreaElement>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [openField, setOpenField] = useState<FieldKey | null>(null);

  // Form fields
  const [assignee, setAssignee] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [dueAtPrecision, setDueAtPrecision] = useState<DueAtPrecision>("none");
  const [description, setDescription] = useState("");
  const [recentAssignees, setRecentAssignees] = useState<string[]>(loadRecentAssignees);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<Project | null>(null);

  const { addTodo, addTodoFromAi, undoLastAiCreate, undoRecord, projects, addProject, deleteProject, todos } =
    useTodo();

  // Fullscreen side effects
  useEffect(() => {
    if (!fullscreen) return;
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

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>
  ) => {
    // Cmd/Ctrl+Enter triggers AI organize (plain + rich editor both)
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      const nativeEvent = e.nativeEvent as KeyboardEvent & { isComposing?: boolean };
      if (nativeEvent.isComposing) return;
      e.preventDefault();
      void handleAiOrganize();
      return;
    }
    if (e.key === "Escape") {
      if (fullscreen) {
        setFullscreen(false);
        return;
      }
      if (openField) {
        setOpenField(null);
        return;
      }
    }
  };

  const buildFieldHint = (): string => {
    const hints: string[] = [];
    if (assignee.trim()) hints.push(`参与人: ${assignee.trim()}`);
    if (projectId) {
      const proj = projects.find((p) => p.id === projectId);
      if (proj) hints.push(`项目: ${proj.name}`);
    }
    if (priority !== "medium") {
      const label = priority === "high" ? "高" : priority === "low" ? "低" : "urgent";
      hints.push(`优先级: ${label}`);
    }
    if (dueAt && dueAtPrecision !== "none") {
      hints.push(`截止时间: 已设置(${dueAtPrecision})`);
    }
    if (description.trim()) hints.push(`描述: ${description.trim().slice(0, 200)}`);
    return hints.length > 0 ? `\n\n[用户已预设]\n${hints.join("\n")}` : "";
  };

  const handleAiOrganize = async () => {
    const text = input.trim();
    if (!text || aiLoading) return;

    setAiLoading(true);
    try {
      const aiInput = text + buildFieldHint();
      const todos = await addTodoFromAi(aiInput);
      if (todos.length === 0) return;
      const firstTodo = todos[0];

      // Save recent assignee on success
      if (assignee.trim()) {
        const updated = [
          assignee.trim(),
          ...recentAssignees.filter((a) => a !== assignee.trim()),
        ].slice(0, MAX_RECENT_ASSIGNEES);
        setRecentAssignees(updated);
        persistRecentAssignees(updated);
      }

      // Reset
      setInput("");
      setAssignee("");
      setProjectId("");
      setPriority("medium");
      setDueAt(null);
      setDueAtPrecision("none");
      setDescription("");
      setOpenField(null);
      setFullscreen(false);
      setExpanded(false);
      onTodoCreated?.(firstTodo.id);

      const summary =
        todos.length === 1
          ? `已创建：${firstTodo.title}`
          : `已按时间拆分为 ${todos.length} 条待办`;

      toast.custom(
        (t) => (
          <div className="flex min-w-[300px] items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-2xl">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{summary}</p>
              {todos.length > 1 && (
                <ul className="mt-1 space-y-0.5">
                  {todos.map((item) => (
                    <li
                      key={item.id}
                      className="truncate text-xs text-muted-foreground"
                    >
                      · {item.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                void undoLastAiCreate()
                  .then((original) => {
                    if (!original) return;
                    setInput(original);
                    setFullscreen(false);
                    setOpenField(null);
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
        { duration: 6000 }
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? `AI 整理失败：${error.message}` : "AI 整理失败"
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    try {
      const project = await addProject(name);
      setProjectId(project.id);
      setNewProjectName("");
      setIsCreatingProject(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "项目创建失败");
    }
  };

  const handleProjectSelect = (value: string) => {
    if (value === NEW_PROJECT_VALUE) {
      setIsCreatingProject(true);
      setNewProjectName("");
      return;
    }
    setIsCreatingProject(false);
    setProjectId(value);
  };

  const removeRecentAssignee = (name: string) => {
    const updated = recentAssignees.filter((a) => a !== name);
    setRecentAssignees(updated);
    persistRecentAssignees(updated);
  };

  const hasComposeInput = input.trim().length > 0;
  const selectedProject = projects.find((p) => p.id === projectId);
  const countTodosForProject = (id: string) =>
    todos.filter(
      (t) =>
        t.projectId === id &&
        t.status !== "done" &&
        t.status !== "cancelled"
    ).length;
  const openFullscreen = () => setFullscreen(true);
  const closeFullscreen = () => setFullscreen(false);

  const toggleField = (key: FieldKey) => {
    setOpenField((prev) => (prev === key ? null : key));
  };

  const expandComposer = () => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setExpanded(true);
  };

  // Collapse the composer when focus leaves it entirely (clicked outside, not
  // into a toolbar button or popover). Use relatedTarget for an immediate
  // check — it points to the next focus target right when blur fires, so we
  // don't have to guess 120ms later. The setTimeout is a fallback for cases
  // where relatedTarget is null (clicking a non-focusable area).
  const handleComposerBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && composerRef.current?.contains(next)) return;
    if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      const active = document.activeElement;
      if (active && composerRef.current?.contains(active)) return;
      if (!input.trim() && !openField && !fullscreen) {
        setExpanded(false);
        setOpenField(null);
      }
    }, 120);
  };

  const handleComposerFocus = () => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };

  return (
    <div ref={composerRef} className="relative">
      <div
        onBlur={handleComposerBlur}
        onFocus={handleComposerFocus}
        className={cn(
          "smart-composer-card glass-card relative rounded-2xl ring-1 transition-all duration-200",
          expanded
            ? "ring-primary/30 shadow-lg shadow-primary/5"
            : "ring-border/40 shadow-sm hover:ring-border/70"
        )}
      >
        {expanded ? (
          <>
            {/* Expanded: full markdown editor + field buttons */}
            <MarkdownEditor
              value={input}
              onChange={setInput}
              textareaRef={textareaRef}
              onKeyDown={handleKeyDown}
              placeholder="写下待办内容，支持 Markdown，AI 润色……"
              rows={3}
              autoFocus
              rich
              toolbarMode="responsive"
              onAiOrganize={handleAiOrganize}
              aiLoading={aiLoading}
              aiDisabled={!hasComposeInput}
              showFullscreenToggle
              onToggleFullscreen={openFullscreen}
              fullscreenToggleLabel="全屏输入"
              defaultHeight={130}
              minHeight={110}
              maxHeight={380}
              toolbarClassName="px-4 pt-3"
              textareaClassName="px-4 pb-5 pt-2 text-sm leading-relaxed"
            />

            {/* 5 lightweight field buttons, each opens a popover */}
            <div className="flex items-center justify-between gap-1.5 px-3 py-2 border-t border-border/30">
              <div className="flex flex-wrap items-center gap-1">
                <FieldPopover
                  open={openField === "assignee"}
                  onOpenChange={(o) => setOpenField(o ? "assignee" : null)}
                  trigger={
                    <FieldButton
                      icon={User}
                      label="参与人"
                      active={openField === "assignee"}
                      value={assignee}
                      onClick={() => toggleField("assignee")}
                    />
                  }
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3" /> 参与人
                    </label>
                    <input
                      autoFocus
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setOpenField(null);
                        }
                      }}
                      placeholder="姓名 / 邮箱（Enter 确认）"
                      className="field-input w-full"
                    />
                    {recentAssignees.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-muted-foreground">历史:</span>
                        {recentAssignees.map((name) => (
                          <span
                            key={name}
                            className="group/ra inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[11px] text-foreground"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setAssignee(name);
                                setOpenField(null);
                              }}
                              className="hover:text-primary"
                            >
                              {name}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRecentAssignee(name)}
                              className="text-muted-foreground/50 hover:text-destructive"
                              aria-label={`删除历史人名 ${name}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </FieldPopover>

                <FieldPopover
                  open={openField === "project"}
                  onOpenChange={(o) => setOpenField(o ? "project" : null)}
                  className="min-w-[260px]"
                  trigger={
                    <FieldButton
                      icon={FolderOpen}
                      label="项目"
                      active={openField === "project"}
                      value={selectedProject?.name ?? ""}
                      emptyLabel="未分配"
                      onClick={() => toggleField("project")}
                    />
                  }
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" /> 项目
                    </label>
                    <div className="flex items-center gap-1">
                      <select
                        value={projectId || (isCreatingProject ? NEW_PROJECT_VALUE : "")}
                        onChange={(e) => handleProjectSelect(e.target.value)}
                        className="field-input flex-1 min-w-0"
                      >
                        <option value="">未分配</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                        <option value={NEW_PROJECT_VALUE}>+ 新建项目…</option>
                      </select>
                      {projectId && selectedProject && (
                        <button
                          type="button"
                          onClick={() => setProjectDeleteTarget(selectedProject)}
                          className="flex-shrink-0 p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="删除当前项目"
                          title="删除项目"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {isCreatingProject && (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleCreateProject();
                          }}
                          placeholder="新项目名称…"
                          className="field-input flex-1 min-w-0"
                        />
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            void handleCreateProject();
                          }}
                          className="flex-shrink-0 p-1 text-emerald-500 hover:text-emerald-400"
                          aria-label="确认新建项目"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProjectId("");
                            setNewProjectName("");
                          }}
                          className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground"
                          aria-label="取消"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </FieldPopover>

                <FieldPopover
                  open={openField === "priority"}
                  onOpenChange={(o) => setOpenField(o ? "priority" : null)}
                  trigger={
                    <FieldButton
                      icon={Flag}
                      label="优先级"
                      active={openField === "priority"}
                      value={priority !== "medium" ? priority : ""}
                      emptyLabel="中"
                      onClick={() => toggleField("priority")}
                    />
                  }
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Flag className="w-3 h-3" /> 优先级
                    </label>
                    <div className="flex gap-1.5">
                      {PRIORITY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPriority(option.value as TodoPriority)}
                          className={cn(
                            "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                            priority === option.value
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/45 bg-background/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </FieldPopover>

                <FieldPopover
                  open={openField === "due"}
                  onOpenChange={(o) => setOpenField(o ? "due" : null)}
                  className="min-w-[280px]"
                  trigger={
                    <FieldButton
                      icon={Calendar}
                      label="截止"
                      active={openField === "due"}
                      value={dueAtPrecision !== "none" ? dueAtPrecision : ""}
                      emptyLabel="无"
                      onClick={() => toggleField("due")}
                    />
                  }
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 截止时间
                    </label>
                    <DuePrecisionPicker
                      dueAt={dueAt}
                      precision={dueAtPrecision}
                      onChange={(next) => {
                        setDueAt(next.dueAt);
                        setDueAtPrecision(next.dueAtPrecision);
                      }}
                    />
                  </div>
                </FieldPopover>

                <FieldPopover
                  open={openField === "description"}
                  onOpenChange={(o) => setOpenField(o ? "description" : null)}
                  className="min-w-[300px]"
                  trigger={
                    <FieldButton
                      icon={Edit3}
                      label="描述"
                      active={openField === "description"}
                      value={description ? "已填写" : ""}
                      onClick={() => toggleField("description")}
                    />
                  }
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> 描述（支持 Markdown）
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenField(null)}
                        className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        完成
                      </button>
                    </div>
                    <MarkdownEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="可选，支持 Markdown 格式…"
                      rows={3}
                      rich
                      defaultHeight={110}
                      minHeight={88}
                      maxHeight={240}
                      textareaClassName="px-2.5 py-2 pb-5 text-xs leading-relaxed"
                      className="overflow-hidden rounded-lg border border-border/45 bg-background/60 focus-within:border-primary/45"
                    />
                  </div>
                </FieldPopover>
              </div>
            </div>
          </>
        ) : (
          /* Collapsed: a single-line clickable prompt */
          <button
            type="button"
            onClick={expandComposer}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-4 w-4 flex-shrink-0 text-primary/70" />
            <span className="truncate">写下待办内容，支持 Markdown，AI 润色……</span>
          </button>
        )}
      </div>

      {fullscreen && (
        <ComposerFullscreenDialog
          value={input}
          textareaRef={fullscreenTextareaRef}
          hasInput={hasComposeInput}
          aiLoading={aiLoading}
          onChange={setInput}
          onClose={closeFullscreen}
          onKeyDown={handleKeyDown}
          onAiOrganize={handleAiOrganize}
        />
      )}

      {/* Project delete confirmation */}
      <ProjectDeleteDialog
        open={projectDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setProjectDeleteTarget(null);
        }}
        project={projectDeleteTarget}
        todoCount={
          projectDeleteTarget
            ? countTodosForProject(projectDeleteTarget.id)
            : 0
        }
        onConfirm={async (mode) => {
          if (!projectDeleteTarget) return;
          try {
            await deleteProject(projectDeleteTarget.id, mode);
            setProjectId("");
            setProjectDeleteTarget(null);
            toast.success(
              mode === "delete"
                ? `项目「${projectDeleteTarget.name}」及其待办已删除`
                : `项目「${projectDeleteTarget.name}」已删除，待办已移到未分配`
            );
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "删除项目失败");
            throw error;
          }
        }}
      />

      {/* Persistent undo entry — survives after the 6s toast disappears */}
      {undoRecord && !aiLoading && (
        <button
          type="button"
          onClick={() => {
            void undoLastAiCreate()
              .then((original) => {
                if (!original) return;
                setInput(original);
                setFullscreen(false);
                setOpenField(null);
                toast.info("已撤销，原始输入已恢复");
              })
              .catch(() => toast.error("撤销失败，请稍后重试"));
          }}
          className="mt-1 flex items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Undo2 className="w-3 h-3" />
          撤销上次 AI 创建
        </button>
      )}
    </div>
  );
}

interface FieldButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  value: string;
  emptyLabel?: string;
  onClick: () => void;
}

function FieldButton({ icon: Icon, label, active, value, emptyLabel, onClick }: FieldButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : value
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      <Icon className="w-3 h-3" />
      {value ? (
        <span className="max-w-[80px] truncate">{value}</span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
