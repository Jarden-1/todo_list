// SmartTodo - Status Badge Component
import { TodoStatus } from "../lib/types";

const STATUS_CONFIG: Record<TodoStatus, { label: string; className: string }> = {
  todo: {
    label: "待办",
    className: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
  },
  doing: {
    label: "进行中",
    className: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
  },
  done: {
    label: "已完成",
    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  },
  cancelled: {
    label: "已取消",
    className: "bg-slate-600/15 text-slate-500 border border-slate-600/30",
  },
};

interface StatusBadgeProps {
  status: TodoStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${textSize} ${padding} ${config.className}`}
    >
      {config.label}
    </span>
  );
}
