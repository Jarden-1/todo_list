// SmartTodo - Timeline View
import { useTodo } from "../../contexts/TodoContext";
import { TodoCard } from "../TodoCard";
import {
  getTimelineGroup,
  timelineGroupLabels,
  TimelineGroup,
} from "../../lib/dateUtils";
import { Clock } from "lucide-react";
import { Todo } from "../../lib/types";

interface TimelineViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const GROUP_ORDER: TimelineGroup[] = [
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "next_week",
  "future",
  "no_due",
];

const GROUP_COLORS: Record<TimelineGroup, string> = {
  overdue: "text-red-400",
  today: "text-amber-400",
  tomorrow: "text-emerald-400",
  this_week: "text-indigo-400",
  next_week: "text-violet-400",
  future: "text-slate-400",
  no_due: "text-slate-600",
};

export function TimelineView({ selectedId, onSelect }: TimelineViewProps) {
  const { todos } = useTodo();

  const activeTodos = todos.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  );

  // Group todos
  const groups = new Map<TimelineGroup, Todo[]>();
  for (const group of GROUP_ORDER) {
    groups.set(group, []);
  }
  for (const todo of activeTodos) {
    const group = getTimelineGroup(todo.dueAt);
    groups.get(group)!.push(todo);
  }

  // Sort within each group
  const pOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  for (const group of GROUP_ORDER) {
    const list = groups.get(group)!;
    list.sort((a: Todo, b: Todo) => {
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    });
  }

  const hasAny = GROUP_ORDER.some((g) => (groups.get(g)?.length ?? 0) > 0);

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="text-sm font-medium text-slate-400">暂无待办</p>
        <p className="text-xs text-slate-600 mt-1">在上方添加你的第一个待办吧</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {GROUP_ORDER.map((group) => {
        const list = groups.get(group)!;
        if (list.length === 0) return null;
        return (
          <div key={group}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${group === "overdue" ? "bg-red-400" : group === "today" ? "bg-amber-400" : group === "tomorrow" ? "bg-emerald-400" : "bg-indigo-400"}`} />
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${GROUP_COLORS[group]}`}>
                {timelineGroupLabels[group]}
              </h3>
              <span className="text-[10px] text-slate-700">{list.length}</span>
            </div>
            <div className="space-y-2">
              {list.map((todo, i) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  isSelected={selectedId === todo.id}
                  onClick={() => onSelect(todo.id)}
                  style={{ animationDelay: `${i * 40}ms` }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
