// SmartTodo - Projects View
// Supports filterProjectId from sidebar project click
import { useMemo, useState } from "react";
import { useTodo } from "../../contexts/TodoContext";
import { TodoCard } from "../TodoCard";
import { TodoProjectMoveDialog } from "../TodoProjectMoveDialog";
import { ProjectDeleteDialog } from "../ProjectDeleteDialog";
import { CheckSquare, ChevronDown, ChevronRight, Edit3, FolderInput, MoreHorizontal, Plus, Square, Trash2, X, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { sortTodosByDueTime } from "../../lib/todoSort";
import type { Project } from "../../lib/types";

export interface ProjectsViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterProjectId?: string | null;
}

export function ProjectsView({ selectedId, onSelect, filterProjectId }: ProjectsViewProps) {
  const { todos, projects, addProject, deleteProject, updateProject } = useTodo();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTodoIds, setSelectedTodoIds] = useState<Set<string>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddProject = async () => {
    if (newProjectName.trim()) {
      const name = newProjectName.trim();
      try {
        await addProject(name);
        setNewProjectName("");
        setShowNewProject(false);
        toast.success(`项目「${name}」已创建`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "项目创建失败");
      }
    }
  };

  const startRename = (project: Project) => {
    setRenamingId(project.id);
    setRenameValue(project.name);
  };

  const handleRenameConfirm = async () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
    setSavingRename(true);
    try {
      await updateProject(renamingId, { name });
      toast.success("项目已重命名");
      setRenamingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重命名失败");
    } finally {
      setSavingRename(false);
    }
  };

  const handleDeleteConfirm = async (mode: "move" | "delete") => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id, mode);
      toast.success(
        mode === "delete"
          ? `项目「${deleteTarget.name}」及其待办已删除`
          : `项目「${deleteTarget.name}」已删除，待办已移到未分配`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除项目失败");
      throw error;
    }
  };

  const selectedIds = useMemo(() => Array.from(selectedTodoIds), [selectedTodoIds]);
  const selectedCount = selectedTodoIds.size;

  const clearSelection = () => {
    setSelectedTodoIds(new Set());
    setSelectionMode(false);
  };

  const toggleTodoSelection = (todoId: string) => {
    setSelectionMode(true);
    setSelectedTodoIds((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  };

  const selectGroupTodos = (todoIds: string[]) => {
    if (todoIds.length === 0) return;
    setSelectionMode(true);
    setSelectedTodoIds((prev) => {
      const next = new Set(prev);
      const allSelected = todoIds.every((todoId) => next.has(todoId));
      todoIds.forEach((todoId) => {
        if (allSelected) next.delete(todoId);
        else next.add(todoId);
      });
      return next;
    });
  };

  const allGroups = [
    ...projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color ?? "#6366F1",
      todos: todos.filter(
        (t) => t.projectId === p.id && t.status !== "done" && t.status !== "cancelled"
      ),
      doneTodos: todos.filter((t) => t.projectId === p.id && t.status === "done"),
    })),
    {
      id: "unassigned",
      name: "未分配项目",
      color: "#94A3B8",
      todos: todos.filter(
        (t) => !t.projectId && t.status !== "done" && t.status !== "cancelled"
      ),
      doneTodos: todos.filter((t) => !t.projectId && t.status === "done"),
    },
  ];

  // If a project filter is active, only show that project
  const projectGroups = filterProjectId
    ? allGroups.filter((g) => g.id === filterProjectId)
    : allGroups;

  return (
    <div className="space-y-4">
      {/* Filter indicator */}
      {filterProjectId && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            仅显示：
            <span className="font-medium text-foreground ml-1">
              {allGroups.find((g) => g.id === filterProjectId)?.name}
            </span>
          </span>
        </div>
      )}

      {/* Add project button */}
      <div className="flex justify-end">
        {showNewProject ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddProject();
                if (e.key === "Escape") setShowNewProject(false);
              }}
              placeholder="项目名称…"
              className="field-input w-36"
            />
            <button
              onClick={() => void handleAddProject()}
              className="text-xs text-primary hover:text-primary/80 px-2 py-1.5 rounded-lg bg-primary/10 transition-colors"
            >
              创建
            </button>
            <button
              onClick={() => setShowNewProject(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            新建项目
          </button>
        )}
      </div>

      {selectionMode && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-background/95 px-4 py-3 shadow-lg shadow-primary/5 backdrop-blur">
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">已选 {selectedCount} 项</span>
            <span className="text-xs text-muted-foreground">可跨项目选择后统一移动</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setMoveDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FolderInput className="h-3.5 w-3.5" />
              移动到项目
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl border border-border/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {projectGroups.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const total = group.todos.length + group.doneTodos.length;
        const progress = total > 0 ? (group.doneTodos.length / total) * 100 : 0;

        return (
          <section
            key={group.id}
            className="project-group border-l border-border/45 pl-4"
            style={{ borderLeftColor: `${group.color}55` }}
          >
            {/* Project header */}
            <div className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/45 transition-colors">
              {renamingId === group.id ? (
                /* Inline rename input */
                <div className="flex flex-1 items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRenameConfirm();
                      if (e.key === "Escape") {
                        setRenamingId(null);
                        setRenameValue("");
                      }
                    }}
                    className="flex-1 min-w-0 rounded-md border border-primary/40 bg-background px-2 py-1 text-sm font-semibold text-foreground outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      void handleRenameConfirm();
                    }}
                    disabled={savingRename}
                    className="flex-shrink-0 p-1 text-emerald-500 hover:text-emerald-400 disabled:opacity-40"
                    aria-label="确认重命名"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setRenamingId(null);
                      setRenameValue("");
                    }}
                    className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="取消重命名"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {group.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progress}%`, backgroundColor: group.color }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {group.doneTodos.length}/{total}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {group.todos.length} 未完成
                      </span>
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={group.todos.length === 0}
                    onClick={() => selectGroupTodos(group.todos.map((todo) => todo.id))}
                    className="rounded-lg px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {group.todos.length > 0 && group.todos.every((todo) => selectedTodoIds.has(todo.id))
                      ? "取消全选"
                      : selectionMode
                        ? "全选本组"
                        : "选择"}
                  </button>
                  {group.id !== "unassigned" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                          aria-label="项目操作"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            const proj = projects.find((p) => p.id === group.id);
                            if (proj) startRename(proj);
                          }}
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-2" />
                          重命名
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            const proj = projects.find((p) => p.id === group.id);
                            if (proj) setDeleteTarget(proj);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          删除项目
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </div>

            {/* Todo list */}
            {!isCollapsed && (
              <div className="space-y-2 pl-5 pt-1">
                {group.todos.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    暂无待办
                  </p>
                ) : (
                  sortTodosByDueTime(group.todos).map((todo) => {
                    const isBatchSelected = selectedTodoIds.has(todo.id);
                    return (
                      <div
                        key={todo.id}
                        className={cn(
                          "grid items-stretch gap-2 transition-all",
                          selectionMode ? "grid-cols-[2rem_minmax(0,1fr)]" : "grid-cols-[0_minmax(0,1fr)]",
                          isBatchSelected && "rounded-2xl bg-primary/[0.04]"
                        )}
                      >
                        <button
                          type="button"
                          aria-label={isBatchSelected ? `取消选择 ${todo.title}` : `选择 ${todo.title}`}
                          onClick={() => toggleTodoSelection(todo.id)}
                          className={cn(
                            "flex items-center justify-center overflow-hidden rounded-xl text-muted-foreground transition-all hover:bg-muted/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
                            selectionMode ? "w-8 opacity-100" : "w-0 opacity-0 pointer-events-none"
                          )}
                        >
                          {isBatchSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                        <TodoCard
                          todo={todo}
                          isSelected={!selectionMode && selectedId === todo.id}
                          onClick={() => {
                            if (selectionMode) toggleTodoSelection(todo.id);
                            else onSelect(todo.id);
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        );
      })}

      <TodoProjectMoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        todoIds={selectedIds}
        onMoved={clearSelection}
      />

      <ProjectDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        project={deleteTarget}
        todoCount={
          deleteTarget
            ? todos.filter(
                (t) =>
                  t.projectId === deleteTarget.id &&
                  t.status !== "done" &&
                  t.status !== "cancelled"
              ).length
            : 0
        }
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
