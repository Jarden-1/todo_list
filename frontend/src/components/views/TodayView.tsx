// SmartTodo - Today View
// Strong visual hierarchy: overdue > today > high-priority
import { useTodo } from "../../contexts/TodoContext";
import { isOverdue, isTodayDate } from "../../lib/dateUtils";
import { Sun, AlertCircle, Flame } from "lucide-react";
import { TodoTimelineList } from "../TodoTimelineList";

interface TodayViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TodayView({ selectedId, onSelect }: TodayViewProps) {
  const { todos } = useTodo();

  const activeTodos = todos.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  );

  const overdueTodos = activeTodos.filter(
    (t) => t.dueAt && isOverdue(t.dueAt) && !isTodayDate(t.dueAt)
  );

  const todayTodos = activeTodos.filter((t) => isTodayDate(t.dueAt));

  const noDateHighPriority = activeTodos.filter(
    (t) => !t.dueAt && (t.priority === "urgent" || t.priority === "high")
  );

  const isEmpty =
    overdueTodos.length === 0 &&
    todayTodos.length === 0 &&
    noDateHighPriority.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Sun className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="text-sm font-semibold text-foreground">今日清空！</p>
        <p className="text-xs text-muted-foreground mt-1.5">没有待处理的任务，好好休息吧 ✨</p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* OVERDUE — highest urgency, red accent banner */}
      {overdueTodos.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-destructive/15">
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-destructive">
              已逾期
            </h3>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
              {overdueTodos.length}
            </span>
          </div>
          <TodoTimelineList
            todos={overdueTodos}
            selectedId={selectedId}
            onSelect={onSelect}
            labelMode="relative"
          />
        </div>
      )}

      {/* TODAY — amber accent */}
      {todayTodos.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/15">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">
              今天
            </h3>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {todayTodos.length}
            </span>
          </div>
          <TodoTimelineList todos={todayTodos} selectedId={selectedId} onSelect={onSelect} />
        </div>
      )}

      {/* HIGH PRIORITY — no date */}
      {noDateHighPriority.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-orange-500/10">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              高优先级
            </h3>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {noDateHighPriority.length}
            </span>
          </div>
          <TodoTimelineList
            todos={noDateHighPriority}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  );
}
