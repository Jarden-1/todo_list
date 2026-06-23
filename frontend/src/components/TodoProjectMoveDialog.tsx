import { Check, FolderInput, Plus, Search, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTodo } from "../contexts/TodoContext";
import type { Todo } from "../lib/types";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface TodoProjectMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todoIds: string[];
  onMoved?: (todos: Todo[]) => void;
}

interface PreviousProjectRecord {
  id: string;
  projectId: string | null;
}

function projectLabel(projectId: string | null, projects: Array<{ id: string; name: string }>) {
  if (!projectId) return "未分配项目";
  return projects.find((project) => project.id === projectId)?.name ?? "未知项目";
}

export function TodoProjectMoveDialog({
  open,
  onOpenChange,
  todoIds,
  onMoved,
}: TodoProjectMoveDialogProps) {
  const { todos, projects, addProject, updateTodo, bulkMoveTodos } = useTodo();
  const [query, setQuery] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [moving, setMoving] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedIds = useMemo(() => Array.from(new Set(todoIds)), [todoIds]);
  const selectedTodos = useMemo(
    () => selectedIds.map((id) => todos.find((todo) => todo.id === id)).filter(Boolean) as Todo[],
    [selectedIds, todos]
  );
  const previousProjects = useMemo<PreviousProjectRecord[]>(
    () => selectedTodos.map((todo) => ({ id: todo.id, projectId: todo.projectId ?? null })),
    [selectedTodos]
  );
  const trimmedQuery = query.trim().toLowerCase();
  const projectOptions = useMemo(
    () => [
      { id: null as string | null, name: "未分配项目", color: "#94A3B8" },
      ...projects.map((project) => ({
        id: project.id as string | null,
        name: project.name,
        color: project.color ?? "#6366F1",
      })),
    ],
    [projects]
  );
  const filteredOptions = projectOptions.filter((project) =>
    project.name.toLowerCase().includes(trimmedQuery)
  );
  const allInSameProject =
    selectedTodos.length > 0 &&
    selectedTodos.every((todo) => (todo.projectId ?? null) === (selectedTodos[0].projectId ?? null));
  const currentProjectId = allInSameProject ? selectedTodos[0].projectId ?? null : undefined;
  const countLabel = selectedTodos.length === 1 ? "1 条待办" : `${selectedTodos.length} 条待办`;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setNewProjectName("");
      setMoving(false);
      setCreating(false);
    }
  }, [open]);

  const restorePreviousProjects = async (records: PreviousProjectRecord[]) => {
    try {
      const uniqueProjectIds = Array.from(new Set(records.map((record) => record.projectId)));
      if (uniqueProjectIds.length === 1) {
        await bulkMoveTodos(records.map((record) => record.id), uniqueProjectIds[0]);
      } else {
        await Promise.all(
          records.map((record) => updateTodo(record.id, { projectId: record.projectId }))
        );
      }
      toast.success("已撤销移动");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤销移动失败");
    }
  };

  const handleMove = async (projectId: string | null) => {
    if (selectedIds.length === 0 || moving) return;
    const noChange = selectedTodos.every((todo) => (todo.projectId ?? null) === projectId);
    if (noChange) {
      onOpenChange(false);
      return;
    }

    setMoving(true);
    try {
      const movedTodos = await bulkMoveTodos(selectedIds, projectId);
      const targetName = projectLabel(projectId, projects);
      onMoved?.(movedTodos);
      onOpenChange(false);
      toast.success(`已移动 ${movedTodos.length} 条待办到「${targetName}」`, {
        action: {
          label: "撤销",
          onClick: () => {
            void restorePreviousProjects(previousProjects);
          },
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移动待办失败");
    } finally {
      setMoving(false);
    }
  };

  const handleCreateAndMove = async () => {
    const name = newProjectName.trim();
    if (!name || creating || moving) return;

    setCreating(true);
    try {
      const project = await addProject(name);
      await handleMove(project.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "新建项目失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4 rounded-2xl border-border/60 p-5" onClick={(event) => event.stopPropagation()}>
        <DialogHeader className="gap-1 pr-8">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderInput className="h-4 w-4 text-primary" />
            移动到项目
          </DialogTitle>
          <DialogDescription>
            将 {countLabel} 移动到指定项目。当前：
            {currentProjectId === undefined ? "多个项目" : projectLabel(currentProjectId, projects)}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索项目…"
            className="field-input w-full pl-9"
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {filteredOptions.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">
              没有匹配的项目，可以在下方新建。
            </p>
          ) : (
            filteredOptions.map((project) => {
              const isCurrent = currentProjectId !== undefined && currentProjectId === project.id;
              return (
                <button
                  key={project.id ?? "unassigned"}
                  type="button"
                  disabled={moving || isCurrent}
                  onClick={() => void handleMove(project.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    isCurrent
                      ? "cursor-default bg-muted/55 text-muted-foreground"
                      : "hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                  {isCurrent ? (
                    <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                      当前
                    </span>
                  ) : null}
                  {isCurrent ? <Check className="h-4 w-4 text-muted-foreground" /> : null}
                </button>
              );
            })
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-border/70 p-3">
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            新建项目并移动
          </label>
          <div className="flex items-center gap-2">
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleCreateAndMove();
              }}
              placeholder="项目名称…"
              className="field-input min-w-0 flex-1"
            />
            <button
              type="button"
              disabled={!newProjectName.trim() || creating || moving}
              onClick={() => void handleCreateAndMove()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              创建并移动
            </button>
          </div>
        </div>

        {previousProjects.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Undo2 className="h-3.5 w-3.5" />
            移动成功后可在提示中撤销。
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
