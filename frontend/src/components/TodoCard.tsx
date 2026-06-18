// SmartTodo - Todo Card Component
// Theme-aware, structured markdown summary, assignee display
import { useEffect, useRef, useState } from "react";
import { Todo } from "../lib/types";
import { useTodo } from "../contexts/TodoContext";
import { PriorityBadge, getPriorityStripeClass } from "./PriorityBadge";
import { formatDueDate, isOverdue, isTodayDate } from "../lib/dateUtils";
import {
  CheckCircle2, Circle, Clock, AlertCircle, User,
} from "lucide-react";
import { cn } from "../lib/utils";
import { TodoActionsMenu } from "./TodoActionsMenu";
import { playCompleteSound } from "../lib/completeSound";
import { toast } from "sonner";
import { cloneTodo } from "../lib/todoClone";
import { formatTodoPreview } from "../lib/todoFormat";
import { useSettings } from "../contexts/SettingsContext";

interface TodoCardProps {
  todo: Todo;
  isSelected?: boolean;
  onClick?: () => void;
}

export function TodoCard({ todo, isSelected, onClick }: TodoCardProps) {
  const { completeTodo, restoreTodo, getProjectById, setSelectedTodoId } = useTodo();
  const { settings } = useSettings();
  const [completeFeedback, setCompleteFeedback] = useState(false);
  const completeTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const project = getProjectById(todo.projectId);
  const overdue = isOverdue(todo.dueAt) && todo.status !== "done" && todo.status !== "cancelled";
  const todayDue = isTodayDate(todo.dueAt);
  const isDone = todo.status === "done";
  const isCancelled = todo.status === "cancelled";

  const completedSubtasks = todo.subtasks.filter((s) => s.done).length;
  const totalSubtasks = todo.subtasks.length;

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDone || isCancelled || completeTimerRef.current) return;
    const snapshot = cloneTodo(todo);

    if (settings.feedback.completeSound) playCompleteSound();
    if (settings.feedback.completeAnimation) setCompleteFeedback(true);

    let completionApplied = false;
    const completionTimer = window.setTimeout(() => {
      completionApplied = true;
      completeTimerRef.current = null;
      completeTodo(todo.id);
    }, 320);
    completeTimerRef.current = completionTimer;

    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      if (settings.feedback.completeAnimation) setCompleteFeedback(false);
    }, 520);

    toast.success("待办已完成", {
      description: todo.title,
      duration: 8000,
      action: {
        label: "撤销",
        onClick: () => {
          if (!completionApplied) window.clearTimeout(completionTimer);
          completeTimerRef.current = null;
          if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
          feedbackTimerRef.current = null;
          setCompleteFeedback(false);
          restoreTodo(snapshot);
        },
      },
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "todo-card group glass-card rounded-xl px-4 py-3 cursor-pointer select-none",
        getPriorityStripeClass(todo.priority),
        isSelected && "ring-1 ring-primary/50 bg-primary/[0.03]",
        completeFeedback && "todo-card-complete-pop",
        isDone && "opacity-60",
        isCancelled && "opacity-40"
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-start">
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
          <div className="min-w-0">
            <h3
              className={cn(
                "text-sm font-semibold leading-snug text-foreground truncate",
                isDone && "line-through text-muted-foreground",
                isCancelled && "line-through text-muted-foreground/60"
              )}
            >
              {todo.title}
            </h3>
          </div>

          {/* Meta row: project + assignee + due date */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {project && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color ?? "#6366F1" }}
                />
                <span className="truncate">{project.name}</span>
              </span>
            )}
            {todo.assignee && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <User className="w-2.5 h-2.5" />
                {todo.assignee}
              </span>
            )}
            {todo.dueAt && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[11px]",
                  overdue ? "overdue-date" : todayDue ? "today-date" : "text-muted-foreground"
                )}
              >
                {overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {overdue && "逾期 · "}
                {formatDueDate(todo.dueAt)}
              </span>
            )}
          </div>

          {/* Markdown preview — structured plain text */}
          {todo.contentMarkdown && (
            <p className="mt-1.5 text-[11px] text-muted-foreground/70 truncate leading-relaxed">
              {formatTodoPreview(todo.contentMarkdown)}
            </p>
          )}

        </div>

        <div className="flex flex-col items-end gap-2 pl-2 min-w-[96px]">
          <div className="flex items-center gap-1">
            <PriorityBadge priority={todo.priority} />
            <div className={cn("transition-opacity", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
              <TodoActionsMenu
                todo={todo}
                triggerClassName="h-7 w-7"
                onDuplicated={(duplicatedTodo) => setSelectedTodoId(duplicatedTodo.id)}
              />
            </div>
          </div>
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-1 w-14 bg-muted rounded-full overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}
