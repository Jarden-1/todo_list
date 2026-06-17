// SmartTodo - Priority Badge Component
import { TodoPriority } from "../lib/types";

const PRIORITY_CONFIG: Record<
  TodoPriority,
  { label: string; className: string; dot: string }
> = {
  urgent: {
    label: "紧急",
    className: "bg-red-500/15 text-red-400 border border-red-500/30",
    dot: "bg-red-400",
  },
  high: {
    label: "高",
    className: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    dot: "bg-amber-400",
  },
  medium: {
    label: "普通",
    className: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
    dot: "bg-indigo-400",
  },
  low: {
    label: "低",
    className: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
    dot: "bg-slate-400",
  },
};

interface PriorityBadgeProps {
  priority: TodoPriority;
  size?: "sm" | "md";
}

export function PriorityBadge({ priority, size = "sm" }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${textSize} ${padding} ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function getPriorityStripeClass(priority: TodoPriority): string {
  return `priority-${priority}`;
}
