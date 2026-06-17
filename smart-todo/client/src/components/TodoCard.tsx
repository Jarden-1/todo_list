// SmartTodo - Todo Card Component
// Theme-aware, structured markdown summary, assignee display
import { Todo } from "../lib/types";
import { useTodo } from "../contexts/TodoContext";
import { PriorityBadge, getPriorityStripeClass } from "./PriorityBadge";
import { formatDueDate, isOverdue, isTodayDate } from "../lib/dateUtils";
import {
  CheckCircle2, Circle, Clock, AlertCircle, User,
} from "lucide-react";
import { cn } from "../lib/utils";

interface TodoCardProps {
  todo: Todo;
  isSelected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** Strip markdown syntax and return clean plain text preview */
function markdownToPlainPreview(md: string, maxLen = 80): string {
  return md
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/, "").replace(/^[-*+]\s+/, "• ").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1").trim())
    .filter(Boolean)
    .join("  ")
    .slice(0, maxLen) + (md.length > maxLen ? "…" : "");
}

export function TodoCard({ todo, isSelected, onClick, style }: TodoCardProps) {
  const { completeTodo, getProjectById, getTagById } = useTodo();
  const project = getProjectById(todo.projectId);
  const overdue = isOverdue(todo.dueAt) && todo.status !== "done" && todo.status !== "cancelled";
  const todayDue = isTodayDate(todo.dueAt);
  const isDone = todo.status === "done";
  const isCancelled = todo.status === "cancelled";

  const completedSubtasks = todo.subtasks.filter((s) => s.done).length;
  const totalSubtasks = todo.subtasks.length;

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDone || isCancelled) return;
    completeTodo(todo.id);
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "todo-card glass-card rounded-xl p-3.5 cursor-pointer select-none",
        getPriorityStripeClass(todo.priority),
        isSelected && "ring-1 ring-primary/50 bg-primary/[0.03]",
        isDone && "opacity-60",
        isCancelled && "opacity-40",
        "card-enter"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Complete toggle */}
        <button
          onClick={handleComplete}
          className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors"
        >
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "text-sm font-medium leading-snug text-foreground line-clamp-2",
                isDone && "line-through text-muted-foreground",
                isCancelled && "line-through text-muted-foreground/60"
              )}
            >
              {todo.title}
            </h3>
            <div className="flex-shrink-0 flex items-center gap-1.5">
              <PriorityBadge priority={todo.priority} />
            </div>
          </div>

          {/* Meta row: project + tags + assignee */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {project && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color ?? "#6366F1" }}
                />
                {project.name}
              </span>
            )}
            {todo.assignee && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <User className="w-2.5 h-2.5" />
                {todo.assignee}
              </span>
            )}
            {todo.tagIds.slice(0, 2).map((tagId) => {
              const tag = getTagById(tagId);
              if (!tag) return null;
              return (
                <span
                  key={tagId}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                >
                  #{tag.name}
                </span>
              );
            })}
            {todo.tagIds.length > 2 && (
              <span className="text-[10px] text-muted-foreground/60">+{todo.tagIds.length - 2}</span>
            )}
          </div>

          {/* Due date */}
          {todo.dueAt && (
            <div
              className={cn(
                "flex items-center gap-1 mt-1.5 text-[11px]",
                overdue ? "overdue-date" : todayDue ? "today-date" : "text-muted-foreground"
              )}
            >
              {overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {overdue && "逾期 · "}
              {formatDueDate(todo.dueAt)}
            </div>
          )}

          {/* Markdown preview — structured plain text */}
          {todo.contentMarkdown && (
            <p className="mt-1.5 text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
              {markdownToPlainPreview(todo.contentMarkdown)}
            </p>
          )}

          {/* Footer: subtasks + AI badge */}
          {(totalSubtasks > 0 || todo.aiMeta?.aiGenerated) && (
            <div className="flex items-center gap-3 mt-2">
              {totalSubtasks > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {completedSubtasks}/{totalSubtasks}
                  </span>
                </div>
              )}
              {todo.aiMeta?.aiGenerated && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-violet-500/15 text-violet-500 border border-violet-500/20">
                  AI
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
