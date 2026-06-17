// SmartTodo - Priority View
import { useTodo } from "../../contexts/TodoContext";
import { TodoCard } from "../TodoCard";
import { TodoPriority } from "../../lib/types";
import { BarChart2 } from "lucide-react";

interface PriorityViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const PRIORITY_GROUPS: Array<{
  priority: TodoPriority;
  label: string;
  color: string;
  bgColor: string;
}> = [
  { priority: "urgent", label: "紧急", color: "text-red-400", bgColor: "bg-red-500/10 border-red-500/20" },
  { priority: "high", label: "高", color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20" },
  { priority: "medium", label: "普通", color: "text-indigo-400", bgColor: "bg-indigo-500/10 border-indigo-500/20" },
  { priority: "low", label: "低", color: "text-slate-400", bgColor: "bg-slate-500/10 border-slate-500/20" },
];

export function PriorityView({ selectedId, onSelect }: PriorityViewProps) {
  const { todos } = useTodo();

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
        <p className="text-sm font-medium text-slate-400">暂无待办</p>
        <p className="text-xs text-slate-600 mt-1">添加待办后按优先级分组展示</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {PRIORITY_GROUPS.map((group) => {
        const list = activeTodos.filter((t) => t.priority === group.priority);
        if (list.length === 0) return null;

        return (
          <div key={group.priority}>
            <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border ${group.bgColor}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${group.color}`}>
                {group.label}
              </span>
              <span className={`text-[10px] ${group.color} opacity-60`}>{list.length} 项</span>
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
