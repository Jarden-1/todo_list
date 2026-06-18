// SmartTodo - Priority View
import { useState } from "react";
import { useTodo } from "../../contexts/TodoContext";
import { TodoCard } from "../TodoCard";
import { TodoPriority } from "../../lib/types";
import { BarChart2 } from "lucide-react";
import { sortTodosByDueTime } from "../../lib/todoSort";
import { CollapsibleGroupHeader } from "../timeline/CollapsibleGroupHeader";

interface PriorityViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const PRIORITY_GROUPS: Array<{
  priority: TodoPriority;
  label: string;
  color: string;
  dot: string;
  count: string;
}> = [
  { priority: "urgent", label: "紧急", color: "text-red-400", dot: "bg-red-400", count: "bg-red-500/12 text-red-400" },
  { priority: "high", label: "高", color: "text-amber-400", dot: "bg-amber-400", count: "bg-amber-500/12 text-amber-500" },
  { priority: "medium", label: "普通", color: "text-indigo-400", dot: "bg-indigo-400", count: "bg-indigo-500/12 text-indigo-500" },
  { priority: "low", label: "低", color: "text-slate-400", dot: "bg-slate-400", count: "bg-slate-500/12 text-slate-500" },
];

export function PriorityView({ selectedId, onSelect }: PriorityViewProps) {
  const { todos } = useTodo();
  const [collapsed, setCollapsed] = useState<Set<TodoPriority>>(new Set());

  const activeTodos = todos.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  );

  const hasAny = activeTodos.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-3">
          <BarChart2 className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">暂无待办</p>
        <p className="text-xs text-muted-foreground/70 mt-1">添加待办后按优先级分组展示</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {PRIORITY_GROUPS.map((group) => {
        const list = sortTodosByDueTime(activeTodos.filter((t) => t.priority === group.priority));
        if (list.length === 0) return null;
        const isCollapsed = collapsed.has(group.priority);
        const toggleGroup = () => {
          setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(group.priority)) next.delete(group.priority);
            else next.add(group.priority);
            return next;
          });
        };

        return (
          <div key={group.priority} className="glass-card rounded-xl overflow-hidden px-3 py-2.5">
            <CollapsibleGroupHeader
              title={group.label}
              collapsed={isCollapsed}
              onToggle={toggleGroup}
              countText={`${list.length} 项`}
              dotClassName={group.dot}
              titleClassName={group.color}
              countClassName={group.count}
              className="mb-0"
            />
            {!isCollapsed && (
              <div className="pt-2 space-y-2">
                {list.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    isSelected={selectedId === todo.id}
                    onClick={() => onSelect(todo.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
