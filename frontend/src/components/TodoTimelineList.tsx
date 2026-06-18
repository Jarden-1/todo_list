import { format, isToday, isYesterday, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Todo } from "../lib/types";
import { cn } from "../lib/utils";
import { sortTodosByDueTime } from "../lib/todoSort";
import { TodoCard } from "./TodoCard";

interface TodoTimelineListProps {
  todos: Todo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  labelMode?: "time" | "relative";
  emptyText?: string;
}

function getTimelineLabel(todo: Todo, labelMode: TodoTimelineListProps["labelMode"]) {
  if (!todo.dueAt) return "未设时间";

  const date = parseISO(todo.dueAt);
  if (Number.isNaN(date.getTime())) return "未设时间";

  if (labelMode === "relative") {
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return `昨天 ${format(date, "HH:mm")}`;
    return format(date, "M月d日 HH:mm", { locale: zhCN });
  }

  return format(date, "HH:mm");
}

export function TodoTimelineList({
  todos,
  selectedId,
  onSelect,
  labelMode = "time",
  emptyText = "暂无待办",
}: TodoTimelineListProps) {
  const sortedTodos = sortTodosByDueTime(todos);
  const groups = sortedTodos.reduce<Array<{ label: string; todos: Todo[] }>>((acc, todo) => {
    const label = getTimelineLabel(todo, labelMode);
    const current = acc[acc.length - 1];

    if (current?.label === label) {
      current.todos.push(todo);
      return acc;
    }

    acc.push({ label, todos: [todo] });
    return acc;
  }, []);

  if (sortedTodos.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="todo-timeline-list" data-label-mode={labelMode}>
      {groups.map((group, index) => {
        const firstTodo = group.todos[0];
        return (
          <div key={`${group.label}-${index}`} className="todo-timeline-row">
            <div className="todo-timeline-rail" aria-hidden="true">
              <span className={cn("todo-timeline-dot", !firstTodo?.dueAt && "todo-timeline-dot-muted")} />
            </div>
            <div className="todo-timeline-content">
              <div className="todo-timeline-time">{group.label}</div>
              <div className="todo-timeline-cards">
                {group.todos.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    isSelected={selectedId === todo.id}
                    onClick={() => onSelect(todo.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
