// SmartTodo - Mobile Bottom Navigation
import { useEffect, useState } from "react";
import { useTodo } from "../contexts/TodoContext";
import { ViewType } from "../lib/types";
import { Sun, Clock, FolderOpen, BarChart2, CheckCircle2, MoreHorizontal } from "lucide-react";
import { cn } from "../lib/utils";
import { isOverdue, isTodayDate } from "../lib/dateUtils";

type NavItem = {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Primary items live in the bottom bar (kept to 3 high-frequency views).
const PRIMARY_ITEMS: NavItem[] = [
  { id: "today", label: "今日", icon: Sun },
  { id: "projects", label: "项目", icon: FolderOpen },
  { id: "completed", label: "已完成", icon: CheckCircle2 },
];

// Secondary items are tucked into the "更多" sheet to avoid a crowded bar.
const MORE_ITEMS: NavItem[] = [
  { id: "timeline", label: "按时间分类", icon: Clock },
  { id: "priority", label: "按优先级分类", icon: BarChart2 },
];

export function MobileNav() {
  const { currentView, setCurrentView, todos } = useTodo();
  const [moreOpen, setMoreOpen] = useState(false);

  const urgentCount = todos.filter(
    (t) =>
      t.status !== "done" &&
      t.status !== "cancelled" &&
      (isTodayDate(t.dueAt) || isOverdue(t.dueAt))
  ).length;

  // Close the sheet whenever the active view changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [currentView]);

  const moreActive = MORE_ITEMS.some((item) => item.id === currentView);
  const handleSelect = (id: ViewType) => {
    setCurrentView(id);
    setMoreOpen(false);
  };

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-[60px] left-0 right-0 z-50 mx-3 mb-2 rounded-2xl border border-border/60 bg-background/98 backdrop-blur shadow-xl overflow-hidden md:hidden">
            {MORE_ITEMS.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 text-sm border-b border-border/40 last:border-0",
                    isActive ? "text-primary font-medium" : "text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border/60 flex md:hidden">
        {PRIMARY_ITEMS.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          const showBadge = item.id === "today" && urgentCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
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
              <span className="max-w-full text-center text-[10px] font-medium leading-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}

        <button
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2.5 gap-1 relative",
            moreActive || moreOpen ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="max-w-full text-center text-[10px] font-medium leading-tight">更多</span>
          {moreActive && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </nav>
    </>
  );
}
