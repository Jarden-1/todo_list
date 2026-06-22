import { Check, CheckCircle2, Plus, X } from "lucide-react";
import type { Todo } from "../../lib/types";
import { cn } from "../../lib/utils";

interface TodoSubtasksSectionProps {
  todo: Todo;
  newSubtask: string;
  showSubtaskInput: boolean;
  onNewSubtaskChange: (value: string) => void;
  onShowSubtaskInputChange: (visible: boolean) => void;
  onAddSubtask: () => void;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
}

export function TodoSubtasksSection({
  todo,
  newSubtask,
  showSubtaskInput,
  onNewSubtaskChange,
  onShowSubtaskInputChange,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TodoSubtasksSectionProps) {
  const completedCount = todo.subtasks.filter((subtask) => subtask.done).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="detail-label">
          子任务{" "}
          {todo.subtasks.length > 0 && (
            <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
              ({completedCount}/{todo.subtasks.length})
            </span>
          )}
        </label>
        <button
          onClick={() => onShowSubtaskInputChange(true)}
          className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
        >
          <Plus className="w-3 h-3" />
          添加
        </button>
      </div>

      {todo.subtasks.length > 0 && (
        <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden">
          <div
            className="h-full brand-gradient rounded-full transition-all"
            style={{ width: `${(completedCount / todo.subtasks.length) * 100}%` }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        {todo.subtasks.map((subtask) => (
          <div key={subtask.id} className="flex items-center gap-2 group">
            <button
              onClick={() => onToggleSubtask(subtask.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors"
            >
              {subtask.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-muted-foreground/40 hover:border-emerald-500 transition-colors" />
              )}
            </button>
            <span className={cn("flex-1 text-xs", subtask.done ? "line-through text-muted-foreground/50" : "text-foreground")}>
              {subtask.title}
            </span>
            <button
              onClick={() => onDeleteSubtask(subtask.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {showSubtaskInput && (
        <div className="flex items-center gap-2 mt-2">
          <input
            autoFocus
            value={newSubtask}
            onChange={(event) => onNewSubtaskChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAddSubtask();
              if (event.key === "Escape") {
                onShowSubtaskInputChange(false);
                onNewSubtaskChange("");
              }
            }}
            onBlur={() => {
              if (!newSubtask.trim()) onShowSubtaskInputChange(false);
            }}
            placeholder="子任务标题…"
            className="flex-1 field-input"
          />
          <button
            onMouseDown={(event) => {
              // Use mousedown (fires before input blur) so adding always runs
              // before the blur handler can close the input. Prevent default
              // to keep the input focused during the add.
              event.preventDefault();
              onAddSubtask();
            }}
            className="text-emerald-500 hover:text-emerald-400"
            aria-label="添加子任务"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
