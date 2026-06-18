import type { Todo } from "../../lib/types";
import { formatDateTime } from "../../lib/dateUtils";

interface TodoTimestampsProps {
  todo: Todo;
}

export function TodoTimestamps({ todo }: TodoTimestampsProps) {
  return (
    <div className="pt-1 space-y-1">
      <p className="text-[10px] text-muted-foreground/50">
        创建于 {formatDateTime(todo.createdAt)}
      </p>
      <p className="text-[10px] text-muted-foreground/50">
        更新于 {formatDateTime(todo.updatedAt)}
      </p>
      {todo.completedAt && (
        <p className="text-[10px] text-emerald-500/70">
          完成于 {formatDateTime(todo.completedAt)}
        </p>
      )}
    </div>
  );
}
