// Single completed-todo card: restore toggle, title, project badge, timestamp,
// hard-delete button, and the actions menu (duplicate / restore / etc).
import { CheckCircle2, Trash2 } from "lucide-react";
import { useTodo } from "../../../contexts/TodoContext";
import { cn } from "../../../lib/utils";
import { DEFAULT_PROJECT_COLOR } from "../../../lib/constants";
import { TodoActionsMenu } from "../../TodoActionsMenu";
import type { Todo } from "../../../lib/types";

interface CompletedTodoCardProps {
  todo: Todo;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUncomplete: (todo: Todo) => void;
  onHardDelete: (todo: Todo) => void;
  onClearSelection: () => void;
  onRestored: (id: string) => void;
  onDuplicated: (todo: Todo) => void;
}

export function CompletedTodoCard({
  todo,
  isSelected,
  onSelect,
  onUncomplete,
  onHardDelete,
  onClearSelection,
  onRestored,
  onDuplicated,
}: CompletedTodoCardProps) {
  const { getProjectById } = useTodo();
  const project = getProjectById(todo.projectId);

  return (
    <div
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
          onUncomplete(todo);
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
                style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }}
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHardDelete(todo);
            if (isSelected) onClearSelection();
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
              if (isSelected) onClearSelection();
            }}
            onRestored={() => onRestored(todo.id)}
            onDuplicated={(duplicatedTodo) => onDuplicated(duplicatedTodo)}
          />
        </div>
      </div>
    </div>
  );
}
