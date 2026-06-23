// SmartTodo - Completed View
// Features: grouped by date, restore/uncomplete, per-card hard delete (no
// confirm), clear-all (confirm), per-day delete (confirm) and multi-day
// select delete (confirm). All deletions are permanent (hard delete).
import { useMemo, useState } from "react";
import { useTodo } from "../../contexts/TodoContext";
import { CheckCircle2, CheckSquare, Square, Trash2, X } from "lucide-react";
import { parseISO, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { TodoActionsMenu } from "../TodoActionsMenu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface CompletedViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Describes a pending bulk-delete awaiting confirmation.
type PendingDelete =
  | { kind: "all"; count: number }
  | { kind: "day"; dateKey: string; label: string; ids: string[] }
  | { kind: "selectedDays"; ids: string[]; dayCount: number };

export function CompletedView({ selectedId, onSelect }: CompletedViewProps) {
  const { todos, uncompleteTodo, deleteTodo, bulkDeleteTodos, getProjectById, setSelectedTodoId } =
    useTodo();

  // Multi-day selection mode.
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingDelete | null>(null);

  const completedTodos = useMemo(
    () =>
      todos
        .filter((t) => t.status === "done")
        .sort((a, b) => {
          const aDate = a.completedAt ?? a.updatedAt;
          const bDate = b.completedAt ?? b.updatedAt;
          return bDate.localeCompare(aDate);
        }),
    [todos]
  );

  // Group by completion date (YYYY-MM-DD). Preserves the sorted order above.
  const groups = useMemo(() => {
    const map = new Map<string, typeof completedTodos>();
    for (const todo of completedTodos) {
      const dateKey = (todo.completedAt ?? todo.updatedAt).slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(todo);
    }
    return map;
  }, [completedTodos]);

  const selectedTodoCount = useMemo(() => {
    let count = 0;
    for (const dateKey of selectedDays) {
      count += groups.get(dateKey)?.length ?? 0;
    }
    return count;
  }, [selectedDays, groups]);

  if (completedTodos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">还没有完成的待办</p>
        <p className="text-xs text-muted-foreground/60 mt-1">完成任务后会在这里归档</p>
      </div>
    );
  }

  const toggleDay = (dateKey: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const exitMultiSelect = () => {
    setMultiSelect(false);
    setSelectedDays(new Set());
  };

  // Per-card hard delete — no confirmation per the product spec.
  const handleCardDelete = async (id: string, title: string) => {
    try {
      await deleteTodo(id);
      toast.success(`已永久删除：${title}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  };

  const runPendingDelete = async () => {
    if (!pending) return;
    try {
      if (pending.kind === "all") {
        const deleted = await bulkDeleteTodos({ all: true });
        toast.success(`已永久清空 ${deleted.length} 项已完成待办`);
      } else if (pending.kind === "day") {
        const deleted = await bulkDeleteTodos({ ids: pending.ids });
        toast.success(`已永久删除 ${pending.label} 的 ${deleted.length} 项`);
      } else {
        const deleted = await bulkDeleteTodos({ ids: pending.ids });
        toast.success(`已永久删除选中 ${pending.dayCount} 天的 ${deleted.length} 项`);
        exitMultiSelect();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary + toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
        <span className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          共完成 {completedTodos.length} 项任务
        </span>
        <div className="flex items-center gap-2">
          {multiSelect ? (
            <button
              type="button"
              onClick={exitMultiSelect}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" /> 退出多选
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMultiSelect(true)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5" /> 多选删除
            </button>
          )}
          <button
            type="button"
            onClick={() => setPending({ kind: "all", count: completedTodos.length })}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-red-500/90 hover:bg-red-500/10 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> 清空全部
          </button>
        </div>
      </div>

      {Array.from(groups.entries()).map(([dateKey, list]) => {
        const date = parseISO(dateKey);
        const label = format(date, "M月d日 EEEE", { locale: zhCN });
        const dayChecked = selectedDays.has(dateKey);

        return (
          <div key={dateKey}>
            <div className="flex items-center gap-2 mb-3">
              {multiSelect && (
                <button
                  type="button"
                  onClick={() => toggleDay(dateKey)}
                  className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  aria-label={dayChecked ? `取消选择 ${label}` : `选择 ${label}`}
                >
                  {dayChecked ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              )}
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground/50">{list.length} 项</span>
              {!multiSelect && (
                <button
                  type="button"
                  onClick={() =>
                    setPending({
                      kind: "day",
                      dateKey,
                      label,
                      ids: list.map((t) => t.id),
                    })
                  }
                  className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  title={`删除 ${label} 的全部已完成`}
                >
                  <Trash2 className="w-3 h-3" /> 删除当天
                </button>
              )}
            </div>
            <div className="space-y-2">
              {list.map((todo) => {
                const project = getProjectById(todo.projectId);
                const isSelected = selectedId === todo.id;

                return (
                  <div
                    key={todo.id}
                    onClick={() => onSelect(todo.id)}
                    className={cn(
                      "glass-card rounded-xl px-4 py-3 cursor-pointer",
                      "flex items-center gap-3 group",
                      isSelected && "ring-1 ring-primary/40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void uncompleteTodo(todo.id)
                          .then(() => toast.success(`已恢复：${todo.title}`))
                          .catch((error) =>
                            toast.error(error instanceof Error ? error.message : "恢复失败")
                          );
                      }}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-emerald-500 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600"
                      title="撤回已完成"
                      aria-label={`撤回已完成：${todo.title}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground line-through line-clamp-1">
                        {todo.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {project && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: project.color ?? "#6366F1" }}
                            />
                            {project.name}
                          </span>
                        )}
                        {todo.completedAt && (
                          <span className="text-[10px] text-muted-foreground/40">
                            {new Date(todo.completedAt).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Always-visible quick delete (hard delete, no confirm). */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleCardDelete(todo.id, todo.title);
                          if (selectedId === todo.id) setSelectedTodoId(null);
                        }}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="永久删除"
                        aria-label={`永久删除：${todo.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div
                        className={cn(
                          "transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <TodoActionsMenu
                          todo={todo}
                          triggerClassName="h-7 w-7"
                          onDeleted={() => {
                            if (selectedId === todo.id) setSelectedTodoId(null);
                          }}
                          onRestored={() => setSelectedTodoId(todo.id)}
                          onDuplicated={(duplicatedTodo) => setSelectedTodoId(duplicatedTodo.id)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Multi-select action bar */}
      {multiSelect && selectedDays.size > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/95 px-4 py-2.5 shadow-xl backdrop-blur">
          <span className="text-xs text-muted-foreground">
            已选 <span className="font-semibold text-foreground">{selectedDays.size}</span> 天，共{" "}
            <span className="font-semibold text-foreground">{selectedTodoCount}</span> 项
          </span>
          <button
            type="button"
            onClick={() => {
              const ids: string[] = [];
              for (const dateKey of selectedDays) {
                for (const t of groups.get(dateKey) ?? []) ids.push(t.id);
              }
              setPending({ kind: "selectedDays", ids, dayCount: selectedDays.size });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> 删除选中
          </button>
        </div>
      )}

      {/* Confirmation dialog for all bulk deletes */}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "all" && "清空全部已完成待办？"}
              {pending?.kind === "day" && `删除 ${pending.label} 的已完成待办？`}
              {pending?.kind === "selectedDays" && `删除选中 ${pending.dayCount} 天的已完成待办？`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "all" &&
                `将永久删除全部 ${pending.count} 项已完成待办，连同其子任务、提醒和附件一并清除，无法恢复。`}
              {pending?.kind === "day" &&
                `将永久删除 ${pending.ids.length} 项已完成待办，连同其子任务、提醒和附件一并清除，无法恢复。`}
              {pending?.kind === "selectedDays" &&
                `将永久删除 ${pending.ids.length} 项已完成待办，连同其子任务、提醒和附件一并清除，无法恢复。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => void runPendingDelete()}
            >
              永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
