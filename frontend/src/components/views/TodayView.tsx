// SmartTodo - Today View
// Strong visual hierarchy: overdue > today > high-priority
import { useState } from "react";
import { useTodo } from "../../contexts/TodoContext";
import { isOverdue, isTodayDate } from "../../lib/dateUtils";
import { Sun, AlertCircle, Flame } from "lucide-react";
import { TodoTimelineGroup } from "../timeline/TodoTimelineGroup";

interface TodayViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TodayView({ selectedId, onSelect }: TodayViewProps) {
  const { todos } = useTodo();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(["overdue"])
  );

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
        <TodoTimelineGroup
          title="已逾期"
          todos={overdueTodos}
          collapsed={collapsedGroups.has("overdue")}
          onToggle={() => toggleGroup("overdue")}
          selectedId={selectedId}
          onSelect={onSelect}
          labelMode="relative"
          icon={AlertCircle}
          iconClassName="bg-destructive/12 text-destructive"
          titleClassName="text-destructive"
          countClassName="bg-destructive/12 text-destructive"
        />
      )}

      {/* TODAY — amber accent */}
      {todayTodos.length > 0 && (
        <TodoTimelineGroup
          title="今天"
          todos={todayTodos}
          collapsed={collapsedGroups.has("today")}
          onToggle={() => toggleGroup("today")}
          selectedId={selectedId}
          onSelect={onSelect}
          icon={Sun}
          iconClassName="bg-amber-500/12 text-amber-500"
          titleClassName="text-amber-500 dark:text-amber-400"
          countClassName="bg-amber-500/12 text-amber-600 dark:text-amber-400"
        />
      )}

      {/* HIGH PRIORITY — no date */}
      {noDateHighPriority.length > 0 && (
        <TodoTimelineGroup
          title="高优先级"
          todos={noDateHighPriority}
          collapsed={collapsedGroups.has("high-priority")}
          onToggle={() => toggleGroup("high-priority")}
          selectedId={selectedId}
          onSelect={onSelect}
          icon={Flame}
          iconClassName="bg-orange-500/10 text-orange-500"
          titleClassName="text-muted-foreground"
          countClassName="bg-muted text-muted-foreground"
        />
      )}
    </div>
  );
}
