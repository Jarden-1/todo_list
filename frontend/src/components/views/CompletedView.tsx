// SmartTodo - Completed View (refactored)
// Orchestrates search, date filtering, per-day collapse, and bulk delete.
// Presentational pieces live in ./completed/*.
import { useEffect, useMemo, useState } from "react";
import { useTodo } from "../../contexts/TodoContext";
import { CheckCircle2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import type { Todo } from "../../lib/types";
import {
  buildSearchHaystack,
  dateKeyForTodo,
  isTodoInDateRange,
  loadCollapsedDays,
  persistCollapsedDays,
  type DateFilter,
  type PendingDelete,
} from "./completed/utils";
import { CompletedToolbar } from "./completed/CompletedToolbar";
import { CompletedDayGroup } from "./completed/CompletedDayGroup";

interface CompletedViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CompletedView({ selectedId, onSelect }: CompletedViewProps) {
  const { todos, uncompleteTodo, deleteTodo, bulkDeleteTodos, setSelectedTodoId } = useTodo();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(loadCollapsedDays);

  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingDelete | null>(null);

  useEffect(() => {
    persistCollapsedDays(collapsedDays);
  }, [collapsedDays]);

  const completedTodos = useMemo(
    () =>
      todos
        .filter((t) => t.status === "done")
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)),
    [todos]
  );

  const filteredTodos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return completedTodos.filter((todo) => {
      if (!isTodoInDateRange(todo, dateFilter, customStart || null, customEnd || null)) return false;
      if (!q) return true;
      return buildSearchHaystack(todo).includes(q);
    });
  }, [completedTodos, searchQuery, dateFilter, customStart, customEnd]);

  const groups = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of filteredTodos) {
      const dateKey = dateKeyForTodo(todo);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(todo);
    }
    return map;
  }, [filteredTodos]);

  const selectedTodoCount = useMemo(() => {
    let count = 0;
    for (const dateKey of selectedDays) count += groups.get(dateKey)?.length ?? 0;
    return count;
  }, [selectedDays, groups]);

  const toggleDayCollapse = (dateKey: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

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

  const handleUncomplete = (todo: Todo) => {
    void uncompleteTodo(todo.id)
      .then(() => toast.success(`已恢复：${todo.title}`))
      .catch((error) => toast.error(error instanceof Error ? error.message : "恢复失败"));
  };

  const handleHardDelete = async (todo: Todo) => {
    try {
      await deleteTodo(todo.id);
      toast.success(`已永久删除：${todo.title}`);
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

  const hasAnyCompleted = completedTodos.length > 0;
  const hasFilterOrSearch =
    Boolean(searchQuery.trim()) || dateFilter !== "all" || Boolean(customStart) || Boolean(customEnd);

  if (!hasAnyCompleted) {
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

  return (
    <div className="space-y-5">
      <CompletedToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        onClearFilters={() => {
          setSearchQuery("");
          setDateFilter("all");
          setCustomStart("");
          setCustomEnd("");
        }}
        totalCount={completedTodos.length}
        filteredCount={filteredTodos.length}
        hasFilterOrSearch={hasFilterOrSearch}
        multiSelect={multiSelect}
        onToggleMultiSelect={() => setMultiSelect(true)}
        onExitMultiSelect={exitMultiSelect}
        onClearAll={() => setPending({ kind: "all", count: completedTodos.length })}
      />

      {filteredTodos.length > 0 &&
        Array.from(groups.entries()).map(([dateKey, list]) => (
          <CompletedDayGroup
            key={dateKey}
            dateKey={dateKey}
            list={list}
            collapsed={collapsedDays.has(dateKey)}
            onToggleCollapse={() => toggleDayCollapse(dateKey)}
            multiSelect={multiSelect}
            dayChecked={selectedDays.has(dateKey)}
            onToggleDay={() => toggleDay(dateKey)}
            selectedId={selectedId}
            onSelect={onSelect}
            onPendingDeleteDay={(label, ids) =>
              setPending({ kind: "day", dateKey, label, ids })
            }
            onUncomplete={handleUncomplete}
            onHardDelete={handleHardDelete}
            onClearSelection={() => setSelectedTodoId(null)}
            onRestored={(id) => setSelectedTodoId(id)}
            onDuplicated={(duplicatedTodo) => setSelectedTodoId(duplicatedTodo.id)}
          />
        ))}

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

      {/* Confirmation dialog */}
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
