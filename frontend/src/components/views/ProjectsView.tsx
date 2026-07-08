// SmartTodo - Projects View (refactored)
// Supports filterProjectId from sidebar project click.
import { useMemo, useState } from "react";
import { useTodo } from "../../contexts/TodoContext";
import { TodoCard } from "../TodoCard";
import { TodoProjectMoveDialog } from "../TodoProjectMoveDialog";
import { ProjectDeleteDialog } from "../ProjectDeleteDialog";
import { CheckSquare, ChevronDown, ChevronRight, FolderInput, Square } from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { sortTodosByDueTime } from "../../lib/todoSort";
import type { Project } from "../../lib/types";
import { isActiveStatus } from "../../lib/todoFilter";
import { DEFAULT_PROJECT_COLOR } from "../../lib/constants";
import { ProjectGroupHeader, type ProjectGroupData } from "./projects/ProjectGroupHeader";
import { InlineProjectCreator } from "./projects/InlineProjectCreator";

export interface ProjectsViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterProjectId?: string | null;
}

export function ProjectsView({ selectedId, onSelect, filterProjectId }: ProjectsViewProps) {
  const { todos, projects, addProject, deleteProject, updateProject } = useTodo();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedDone, setExpandedDone] = useState<Set<string>>(new Set());
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

  const toggleDoneExpanded = (id: string) => {
    setExpandedDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    const name = newProjectName.trim();
    try {
      await addProject(name);
      setNewProjectName("");
      setShowNewProject(false);
      toast.success(`项目「${name}」已创建`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "项目创建失败");
    }
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

  const allGroups: {
    id: string;
    name: string;
    color: string;
    todos: typeof todos;
    doneTodos: typeof todos;
  }[] = [
    ...projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color ?? DEFAULT_PROJECT_COLOR,
      todos: todos.filter((t) => t.projectId === p.id && isActiveStatus(t.status)),
      doneTodos: todos.filter((t) => t.projectId === p.id && t.status === "done"),
    })),
    {
      id: "unassigned",
      name: "未分配项目",
      color: "#94A3B8",
      todos: todos.filter((t) => !t.projectId && isActiveStatus(t.status)),
      doneTodos: todos.filter((t) => !t.projectId && t.status === "done"),
    },
  ];

  const projectGroups = filterProjectId
    ? allGroups.filter((g) => g.id === filterProjectId)
    : allGroups;

  return (
    <div className="space-y-4">
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

      <div className="flex justify-end">
        <InlineProjectCreator
          show={showNewProject}
          value={newProjectName}
          onShowChange={setShowNewProject}
          onValueChange={setNewProjectName}
          onCreate={() => void handleAddProject()}
        />
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
        const projectData =
          group.id !== "unassigned" ? projects.find((p) => p.id === group.id) ?? null : null;
        const allSelected =
          group.todos.length > 0 && group.todos.every((todo) => selectedTodoIds.has(todo.id));

        return (
          <section
            key={group.id}
            className="project-group border-l border-border/45 pl-4"
            style={{ borderLeftColor: `${group.color}55` }}
          >
            <ProjectGroupHeader
              group={{
                id: group.id,
                name: group.name,
                color: group.color,
                todoCount: group.todos.length,
                doneCount: group.doneTodos.length,
              }}
              collapsed={isCollapsed}
              selectionMode={selectionMode}
              allSelected={allSelected}
              renaming={renamingId === group.id}
              renameValue={renameValue}
              savingRename={savingRename}
              projectData={projectData}
              onToggleCollapse={() => toggleCollapse(group.id)}
              onSelectGroup={() => selectGroupTodos(group.todos.map((todo) => todo.id))}
              onStartRename={() => {
                if (projectData) {
                  setRenamingId(projectData.id);
                  setRenameValue(projectData.name);
                }
              }}
              onRenameValueChange={setRenameValue}
              onRenameConfirm={() => void handleRenameConfirm()}
              onRenameCancel={() => {
                setRenamingId(null);
                setRenameValue("");
              }}
              onDeleteProject={() => setDeleteTarget(projectData)}
            />

            {!isCollapsed && (
              <div className="space-y-2 pl-5 pt-1">
                {group.todos.length === 0 && group.doneTodos.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">暂无待办</p>
                ) : (
                  sortTodosByDueTime(group.todos).map((todo) => {
                    const isBatchSelected = selectedTodoIds.has(todo.id);
                    return (
                      <div
                        key={todo.id}
                        className={cn(
                          "grid items-stretch gap-2 transition-all",
                          selectionMode
                            ? "grid-cols-[2rem_minmax(0,1fr)]"
                            : "grid-cols-[0_minmax(0,1fr)]",
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

                {/* Done todos — collapsed by default to keep the view focused
                    on active items, but revealed so the 8/9 count matches
                    what's actually visible. */}
                {group.doneTodos.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => toggleDoneExpanded(group.id)}
                      className="flex w-full items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      aria-expanded={expandedDone.has(group.id)}
                    >
                      {expandedDone.has(group.id) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      已完成 ({group.doneTodos.length})
                    </button>
                    {expandedDone.has(group.id) && (
                      <div className="mt-1 space-y-2 opacity-70">
                        {group.doneTodos.map((todo) => (
                          <TodoCard
                            key={todo.id}
                            todo={todo}
                            isSelected={!selectionMode && selectedId === todo.id}
                            onClick={() => onSelect(todo.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
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
                (t) => t.projectId === deleteTarget.id && isActiveStatus(t.status)
              ).length
            : 0
        }
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
