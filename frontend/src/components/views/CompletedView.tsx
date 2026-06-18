// SmartTodo - Completed View
// Features: grouped by date, restore/uncomplete button, contextual actions menu
import { useTodo } from "../../contexts/TodoContext";
import { CheckCircle2 } from "lucide-react";
import { parseISO, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { TodoActionsMenu } from "../TodoActionsMenu";

interface CompletedViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CompletedView({ selectedId, onSelect }: CompletedViewProps) {
  const { todos, uncompleteTodo, getProjectById, setSelectedTodoId } = useTodo();

  const completedTodos = todos
    .filter((t) => t.status === "done")
    .sort((a, b) => {
      const aDate = a.completedAt ?? a.updatedAt;
      const bDate = b.completedAt ?? b.updatedAt;
      return bDate.localeCompare(aDate);
    });

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

  // Group by completion date
  const groups = new Map<string, typeof completedTodos>();
  for (const todo of completedTodos) {
    const dateStr = todo.completedAt ?? todo.updatedAt;
    const dateKey = dateStr.slice(0, 10);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(todo);
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          共完成 {completedTodos.length} 项任务
        </span>
      </div>

      {Array.from(groups.entries()).map(([dateKey, list]) => {
        const date = parseISO(dateKey);
        const label = format(date, "M月d日 EEEE", { locale: zhCN });

        return (
          <div key={dateKey}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground/50">{list.length} 项</span>
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

                    <div className={cn(
                      "flex items-center gap-1 transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
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
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
