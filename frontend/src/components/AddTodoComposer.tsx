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
  /**
   * When this value changes, the composer collapses (closes any open popover
   * and exits fullscreen). The input text is preserved so the user can resume
   * editing if they navigate back. Use it when the surrounding view changes
   * (e.g. sidebar navigation) so the composer doesn't stay expanded on the
   * new view.
   */
  resetKey?: number | string;
}

export function AddTodoComposer({ onTodoCreated, resetKey }: AddTodoComposerProps) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  // Controls whether the expanded DOM is actually mounted. We keep it
  // mounted for ~300ms after collapsing so the grid height transition has
  // real content to shrink — without this the collapse is instant.
  const [renderExpanded, setRenderExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fullscreenTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dueAtInputRef = useRef<HTMLInputElement>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);

  // Refs that always hold the latest values — used inside setTimeout
  // callbacks so we never read a stale closure value when deciding whether
  // to collapse.
  const inputRef = useRef(input);
  const openFieldRef = useRef<FieldKey | null>(null);
  const fullscreenRef = useRef(fullscreen);
  inputRef.current = input;
  openFieldRef.current = openField;
  fullscreenRef.current = fullscreen;

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

  // Collapse the composer when the surrounding view changes (e.g. user
  // navigates from "today" to "timeline"). The input text is preserved so
  // the user can pick up where they left off.
  useEffect(() => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (unmountTimerRef.current) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    setOpenField(null);
    setFullscreen(false);
    setExpanded(false);
    setRenderExpanded(false);
  }, [resetKey]);

  // Sync renderExpanded with expanded:
  // - Expand: mount the expanded DOM immediately so the grid can grow.
  // - Collapse: keep it mounted for 300ms so the grid transition has real
  //   content to shrink, then unmount.
  useEffect(() => {
    if (unmountTimerRef.current) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    if (expanded) {
      setRenderExpanded(true);
    } else {
      unmountTimerRef.current = window.setTimeout(() => {
        setRenderExpanded(false);
      }, 300);
    }
    return () => {
      if (unmountTimerRef.current) {
        window.clearTimeout(unmountTimerRef.current);
        unmountTimerRef.current = null;
      }
    };
  }, [expanded]);

  // Clear collapse timer when the user re-focuses the composer (e.g. starts
  // typing again before the delayed collapse fires).
  const handleComposerFocus = () => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };

  // Close any open popover AND, if there's no input / no fullscreen, schedule
  // a delayed collapse. This is the single entry point that connects "the
  // user is done with the fields" to "the composer should fold back down".
  const closeField = () => {
    setOpenField(null);
    openFieldRef.current = null;
    if (fullscreenRef.current) return;
    if (inputRef.current.trim()) return;
    if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      // Re-check with latest refs — the user may have started typing or
      // opened another popover during the delay.
      if (
        !inputRef.current.trim() &&
        !fullscreenRef.current &&
        openFieldRef.current === null
      ) {
        setExpanded(false);
      }
    }, 200);
  };

  const toggleField = (key: FieldKey) => {
    // If clicking the field that's already open, close it (and maybe collapse).
    if (openField === key) {
      closeField();
      return;
    }
    setOpenField(key);
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
      setRenderExpanded(false);
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
        closeField();
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

  // Open the native datetime-local picker from the "截止 → 精确时刻" button
  // in the composer — mirrors the detail panel's openDuePicker behaviour.
  const openDuePicker = () => {
    const input = dueAtInputRef.current;
    if (!input) return;
    input.focus();
    input.showPicker?.();
  };

  const handleComposerBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && composerRef.current?.contains(next)) return;
    if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      const active = document.activeElement;
      if (active && composerRef.current?.contains(active)) return;
      if (!inputRef.current.trim() && openFieldRef.current === null && !fullscreenRef.current) {
        setExpanded(false);
        setOpenField(null);
        openFieldRef.current = null;
      }
    }, 200);
  };

  return (
    <div ref={composerRef} className="relative">
      <div
        onBlur={handleComposerBlur}
        onFocus={handleComposerFocus}
        className={cn(
          "smart-composer-card glass-card relative rounded-2xl ring-1 transition-all duration-300 ease-out",
          expanded
            ? "ring-primary/30 shadow-lg shadow-primary/5"
            : "ring-border/40 shadow-sm hover:ring-border/70"
        )}
      >
        {/* Collapsed placeholder — always rendered; the grid row animates
            between 1fr (visible) and 0fr (hidden) so the collapse/expand is
            a smooth height transition instead of a DOM swap. */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            expanded ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          )}
        >
          <div className="overflow-hidden">
            <button
              type="button"
              onClick={expandComposer}
              tabIndex={expanded ? -1 : 0}
              aria-hidden={expanded}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground",
                expanded && "pointer-events-none"
              )}
            >
              <Plus className="h-4 w-4 flex-shrink-0 text-primary/70" />
              <span className="truncate">支持 Markdown 排版 · 输入多待办 AI 自动拆分……</span>
            </button>
          </div>
        </div>

        {/* Expanded content — rendered (mounted) whenever expanded OR while
            the collapse transition is still running (renderExpanded). The
            grid row animates from 0fr → 1fr on expand and 1fr → 0fr on
            collapse, with the DOM unmounting 300ms after collapse starts. */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            {renderExpanded && (
              <>
                <MarkdownEditor
                  value={input}
                  onChange={setInput}
                  textareaRef={textareaRef}
                  onKeyDown={handleKeyDown}
                  placeholder="支持 Markdown 排版 · 输入多待办 AI 自动拆分……"
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
                      onOpenChange={(o) => (o ? setOpenField("assignee") : closeField())}
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
                      containerRef={composerRef}
                    />

                    <ProjectPopover
                      open={openField === "project"}
                      onOpenChange={(o) => (o ? setOpenField("project") : closeField())}
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
                      containerRef={composerRef}
                    />

                    <FieldPopover
                      open={openField === "priority"}
                      onOpenChange={(o) => (o ? setOpenField("priority") : closeField())}
                      containerRef={composerRef}
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
                      onOpenChange={(o) => (o ? setOpenField("due") : closeField())}
                      containerRef={composerRef}
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
                          datetimeRef={dueAtInputRef}
                          onOpenDatetimePicker={openDuePicker}
                        />
                      </div>
                    </FieldPopover>

                    <FieldPopover
                      open={openField === "description"}
                      onOpenChange={(o) => (o ? setOpenField("description") : closeField())}
                      containerRef={composerRef}
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
                            onClick={closeField}
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
            )}
          </div>
        </div>
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
