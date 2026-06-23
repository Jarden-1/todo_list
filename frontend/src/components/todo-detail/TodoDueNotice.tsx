import { AlertTriangle, Clock } from "lucide-react";
import type { Todo } from "../../lib/types";
import { getDueReminder, isStaleDueWarning } from "../../lib/todoDueReminder";
import { cn } from "../../lib/utils";

interface TodoDueNoticeProps {
  todo: Todo;
}

export function TodoDueNotice({ todo }: TodoDueNoticeProps) {
  const dueReminder = getDueReminder(todo);
  const dueReminderClassName = {
    danger: "bg-destructive/8 border-destructive/18 text-destructive",
    warning: "bg-amber-500/8 border-amber-500/18 text-amber-600 dark:text-amber-400",
    primary: "bg-primary/7 border-primary/16 text-primary",
    muted: "bg-muted/35 border-border/35 text-muted-foreground",
  }[dueReminder.tone];
  // Drop AI's time-related warnings (e.g. "无明确截止时间") whenever the live due
  // notice above already settles the due-time state, so they never contradict /
  // duplicate it:
  //  - the user set a concrete due date (dueAt present), OR
  //  - the user explicitly chose "无" precision (dueAtPrecision === "none"),
  //    where the top notice already says "未设置截止时间".
  const dueResolved = Boolean(todo.dueAt) || todo.dueAtPrecision === "none";
  const visibleAiWarnings = (todo.aiMeta?.warnings ?? []).filter(
    (warning) => !isStaleDueWarning(warning, dueResolved)
  );

  return (
    <>
      <div className={cn("flex items-start gap-2 rounded-xl border p-3", dueReminderClassName)}>
        {dueReminder.tone === "danger" ? (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium">{dueReminder.title}</p>
          {dueReminder.description && (
            <p className="text-[11px] opacity-75">{dueReminder.description}</p>
          )}
        </div>
      </div>

      {visibleAiWarnings.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            {visibleAiWarnings.map((warning, index) => (
              <p key={index} className="text-xs text-amber-600 dark:text-amber-400">
                {warning}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
