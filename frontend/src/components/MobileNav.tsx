// SmartTodo - Mobile Bottom Navigation
import { useTodo } from "../contexts/TodoContext";
import { ViewType } from "../lib/types";
import { Sun, Clock, FolderOpen, BarChart2, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { isOverdue, isTodayDate } from "../lib/dateUtils";

const NAV_ITEMS: Array<{
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "today", label: "今日待办", icon: Sun },
  { id: "timeline", label: "按时间分类", icon: Clock },
  { id: "projects", label: "按项目分类", icon: FolderOpen },
  { id: "priority", label: "按优先级分类", icon: BarChart2 },
  { id: "completed", label: "已完成", icon: CheckCircle2 },
];

export function MobileNav() {
  const { currentView, setCurrentView, todos } = useTodo();

  const urgentCount = todos.filter(
    (t) =>
      t.status !== "done" &&
      t.status !== "cancelled" &&
      (isTodayDate(t.dueAt) || isOverdue(t.dueAt))
  ).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border/60 flex md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = currentView === item.id;
        const Icon = item.icon;
        const showBadge = item.id === "today" && urgentCount > 0;

        return (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2.5 gap-1 relative",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {showBadge && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                  {urgentCount}
                </span>
              )}
            </div>
            <span className="max-w-full text-center text-[9px] font-medium leading-tight">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
