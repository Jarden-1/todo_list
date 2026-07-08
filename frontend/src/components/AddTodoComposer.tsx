// SmartTodo - Smart Composer (refactored)
// Single Markdown input + 5 lightweight field popovers + fullscreen/AI.
// Presentational popovers live in ./composer/*.
import { useState, useRef, useEffect } from "react";
import { Calendar, CheckCircle2, Edit3, Flag, Plus, Undo2 } from "lucide-react";
import { useTodo } from "../contexts/TodoContext";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { MarkdownEditor } from "./MarkdownEditor";
import { ComposerFullscreenDialog } from "./composer/ComposerFullscreenDialog";
import { FieldPopover } from "./composer/FieldPopover";
import { FieldButton } from "./composer/FieldButton";
import { AssigneePopover } from "./composer/AssigneePopover";
import { ProjectPopover, NEW_PROJECT_VALUE } from "./composer/ProjectPopover";
import { DuePrecisionPicker } from "./todo-detail/DuePrecisionPicker";
import { ProjectDeleteDialog } from "./ProjectDeleteDialog";
import { PRIORITY_OPTIONS } from "../lib/todoOptions";
import {
  loadRecentAssignees,
  persistRecentAssignees,
  MAX_RECENT_ASSIGNEES,
} from "./composer/recentAssignees";
import type { DueAtPrecision, Project, TodoPriority } from "../lib/types";

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
  const [assignees, setAssignees] = useState<string[]>([]);
  const [assigneeInput, setAssigneeInput] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [dueAtPrecision, setDueAtPrecision] = useState<DueAtPrecision>("none");
  const [description, setDescription] = useState("");
  const [recentAssignees, setRecentAssignees] = useState<string[]>(loadRecentAssignees);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<Project | null>(null);

  const { addProject, addTodoFromAi, undoLastAiCreate, undoRecord, projects, deleteProject, todos } =
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

  const toggleField = (key: FieldKey) => {
    setOpenField((prev) => (prev === key ? null : key));
  };

  const addAssignee = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAssignees((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setRecentAssignees((prev) => {
      if (prev.includes(trimmed)) return prev;
      const updated = [trimmed, ...prev].slice(0, MAX_RECENT_ASSIGNEES);
      persistRecentAssignees(updated);
      return updated;
    });
  };

  const removeRecentAssignee = (name: string) => {
    const updated = recentAssignees.filter((a) => a !== name);
    setRecentAssignees(updated);
    persistRecentAssignees(updated);
  };

  const buildFieldHint = (): string => {
    const hints: string[] = [];
    if (assignees.length > 0) hints.push(`参与人: ${assignees.join(", ")}`);
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
      const createdTodos = await addTodoFromAi(aiInput);
      if (createdTodos.length === 0) return;
      const firstTodo = createdTodos[0];

      // Reset form
      setInput("");
      setAssignees([]);
      setAssigneeInput("");
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
        createdTodos.length === 1
          ? `已创建：${firstTodo.title}`
          : `已按时间拆分为 ${createdTodos.length} 条待办`;

      toast.custom(
        (t) => (
          <div className="flex min-w-[300px] items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-2xl">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{summary}</p>
              {createdTodos.length > 1 && (
                <ul className="mt-1 space-y-0.5">
                  {createdTodos.map((item) => (
                    <li key={item.id} className="truncate text-xs text-muted-foreground">
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
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

  const hasComposeInput = input.trim().length > 0;
  const selectedProject = projects.find((p) => p.id === projectId);
  const countTodosForProject = (id: string) =>
    todos.filter((t) => t.projectId === id && t.status !== "done" && t.status !== "cancelled").length;

  const expandComposer = () => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setExpanded(true);
  };

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
              onToggleFullscreen={() => setFullscreen(true)}
              fullscreenToggleLabel="全屏输入"
              defaultHeight={130}
              minHeight={110}
              maxHeight={380}
              toolbarClassName="px-4 pt-3"
              textareaClassName="px-4 pb-5 pt-2 text-sm leading-relaxed"
            />

            <div className="flex items-center justify-between gap-1.5 px-3 py-2 border-t border-border/30">
              <div className="flex flex-wrap items-center gap-1">
                <AssigneePopover
                  open={openField === "assignee"}
                  onOpenChange={(o) => setOpenField(o ? "assignee" : null)}
                  onToggle={() => toggleField("assignee")}
                  assignees={assignees}
                  assigneeInput={assigneeInput}
                  recentAssignees={recentAssignees}
                  onAssigneeInputChange={setAssigneeInput}
                  onAddAssignee={addAssignee}
                  onRemoveAssignee={(index) =>
                    setAssignees((prev) => prev.filter((_, i) => i !== index))
                  }
                  onRemoveRecentAssignee={removeRecentAssignee}
                />

                <ProjectPopover
                  open={openField === "project"}
                  onOpenChange={(o) => setOpenField(o ? "project" : null)}
                  onToggle={() => toggleField("project")}
                  projectId={projectId}
                  projects={projects}
                  selectedProject={selectedProject}
                  isCreatingProject={isCreatingProject}
                  newProjectName={newProjectName}
                  onProjectSelect={handleProjectSelect}
                  onCreateProject={() => void handleCreateProject()}
                  onNewProjectNameChange={setNewProjectName}
                  onCancelCreate={() => {
                    setProjectId("");
                    setNewProjectName("");
                  }}
                  onDeleteProject={() => setProjectDeleteTarget(selectedProject ?? null)}
                />

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
          onClose={() => setFullscreen(false)}
          onKeyDown={handleKeyDown}
          onAiOrganize={handleAiOrganize}
        />
      )}

      <ProjectDeleteDialog
        open={projectDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setProjectDeleteTarget(null);
        }}
        project={projectDeleteTarget}
        todoCount={projectDeleteTarget ? countTodosForProject(projectDeleteTarget.id) : 0}
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
