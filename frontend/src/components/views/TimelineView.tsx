// SmartTodo - Timeline View
import { useTodo } from "../../contexts/TodoContext";
import { TodoCard } from "../TodoCard";
import { Clock } from "lucide-react";
import { Todo } from "../../lib/types";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TimelineViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const NO_DUE_KEY = "no_due";
const WEEKDAY_DATE_FORMAT = "M月d日 EEE";

const RELATIVE_LABELS: Record<number, string> = {
  [-2]: "前天",
  [-1]: "昨天",
  0: "今天",
  1: "明天",
  2: "后天",
};

const pOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function getLocalDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getDateLabel(date: Date, today: Date) {
  const dateLabel = format(date, WEEKDAY_DATE_FORMAT, { locale: zhCN });
  const offset = differenceInCalendarDays(date, today);
  const relativeLabel = RELATIVE_LABELS[offset];
  return relativeLabel ? `${relativeLabel}（${dateLabel}）` : dateLabel;
}

function getGroupTone(key: string, today: Date) {
  if (key === NO_DUE_KEY) {
    return { text: "text-muted-foreground", dot: "bg-muted-foreground/55" };
  }

  const offset = differenceInCalendarDays(parseISO(key), today);
  if (offset < 0) return { text: "text-red-500", dot: "bg-red-400" };
  if (offset === 0) return { text: "text-amber-500", dot: "bg-amber-400" };
  if (offset <= 2) return { text: "text-emerald-500", dot: "bg-emerald-400" };
  return { text: "text-indigo-500", dot: "bg-indigo-400" };
}

export function TimelineView({ selectedId, onSelect }: TimelineViewProps) {
  const { todos } = useTodo();

  const activeTodos = todos.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  );

  const today = new Date();
  const groups = new Map<string, Todo[]>();

  for (const todo of activeTodos) {
    const group = todo.dueAt ? getLocalDateKey(parseISO(todo.dueAt)) : NO_DUE_KEY;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(todo);
  }

  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === NO_DUE_KEY) return 1;
    if (b === NO_DUE_KEY) return -1;
    return a.localeCompare(b);
  });

  for (const [, list] of sortedGroups) {
    list.sort((a: Todo, b: Todo) => {
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    });
  }

  if (sortedGroups.length === 0) {
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
      {sortedGroups.map(([group, list]) => {
        const tone = getGroupTone(group, today);
        const label =
          group === NO_DUE_KEY ? "无截止时间" : getDateLabel(parseISO(group), today);

        return (
          <div key={group}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${tone.dot}`} />
              <h3 className={`text-xs font-semibold tracking-wide ${tone.text}`}>
                {label}
              </h3>
              <span className="text-[10px] text-muted-foreground">{list.length}</span>
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
