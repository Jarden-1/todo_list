// SmartTodo - Main Home Page
// Desktop: Left sidebar (224px) + Main content + Right detail panel (384px)
// Mobile: Top header + Main content + Bottom nav + Detail drawer
import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { MobileNav } from "../components/MobileNav";
import { MobileDetailDrawer } from "../components/MobileDetailDrawer";
import { AddTodoComposer } from "../components/AddTodoComposer";
import { TodoDetailPanel } from "../components/TodoDetailPanel";
import { TodayView } from "../components/views/TodayView";
import { TimelineView } from "../components/views/TimelineView";
import { ProjectsView } from "../components/views/ProjectsView";
import { PriorityView } from "../components/views/PriorityView";
import { CompletedView } from "../components/views/CompletedView";
import { useTodo } from "../contexts/TodoContext";
import { ScrollArea } from "../components/ui/scroll-area";
import { Sun, Clock, FolderOpen, BarChart2, CheckCircle2, Menu, X } from "lucide-react";
import { cn } from "../lib/utils";

const VIEW_CONFIG = {
  today: { title: "今日", subtitle: "今天需要处理的任务", icon: Sun, iconColor: "text-amber-500" },
  timeline: { title: "时间轴", subtitle: "按时间维度管理任务节奏", icon: Clock, iconColor: "text-primary" },
  projects: { title: "项目", subtitle: "查看每个项目的推进情况", icon: FolderOpen, iconColor: "text-emerald-500" },
  priority: { title: "优先级", subtitle: "聚焦高价值和紧急事项", icon: BarChart2, iconColor: "text-violet-500" },
  completed: { title: "已完成", subtitle: "归档与回顾已完成的任务", icon: CheckCircle2, iconColor: "text-emerald-500" },
};

export default function Home() {
  const { currentView, selectedTodoId, setSelectedTodoId, todos } = useTodo();
  const selectedTodo = todos.find((t) => t.id === selectedTodoId);
  const viewConfig = VIEW_CONFIG[currentView];
  const Icon = viewConfig.icon;

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);

  const activeTodosCount = todos.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  ).length;

  const ViewContent = () => (
    <>
      {currentView === "today" && (
        <TodayView
          selectedId={selectedTodoId}
          onSelect={(id) => setSelectedTodoId(selectedTodoId === id ? null : id)}
        />
      )}
      {currentView === "timeline" && (
        <TimelineView
          selectedId={selectedTodoId}
          onSelect={(id) => setSelectedTodoId(selectedTodoId === id ? null : id)}
        />
      )}
      {currentView === "projects" && (
        <ProjectsView
          selectedId={selectedTodoId}
          onSelect={(id) => setSelectedTodoId(selectedTodoId === id ? null : id)}
          filterProjectId={filterProjectId}
        />
      )}
      {currentView === "priority" && (
        <PriorityView
          selectedId={selectedTodoId}
          onSelect={(id) => setSelectedTodoId(selectedTodoId === id ? null : id)}
        />
      )}
      {currentView === "completed" && (
        <CompletedView
          selectedId={selectedTodoId}
          onSelect={(id) => setSelectedTodoId(selectedTodoId === id ? null : id)}
        />
      )}
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Left Sidebar */}
      <div className="hidden md:flex h-full">
        <Sidebar
          filterProjectId={filterProjectId}
          onFilterProject={setFilterProjectId}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 bottom-0 w-64 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              filterProjectId={filterProjectId}
              onFilterProject={(id) => {
                setFilterProjectId(id);
                setMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="hidden md:flex w-7 h-7 rounded-lg bg-muted items-center justify-center">
              <Icon className={cn("w-4 h-4", viewConfig.iconColor)} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground font-display">
                {viewConfig.title}
                {filterProjectId && currentView === "projects" && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    · 已过滤
                  </span>
                )}
              </h2>
              <p className="hidden md:block text-[10px] text-muted-foreground">{viewConfig.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">
              {activeTodosCount} 项待办
            </span>
          </div>
        </header>

        {/* Add composer */}
        <div className="px-4 md:px-6 pt-4 pb-3 flex-shrink-0">
          <AddTodoComposer onTodoCreated={(id) => setSelectedTodoId(id)} />
        </div>

        {/* View content */}
        <ScrollArea className="flex-1 px-4 md:px-6 pb-20 md:pb-6">
          <div className="pt-2 pb-4">
            <ViewContent />
          </div>
        </ScrollArea>
      </div>

      {/* Desktop Right detail panel */}
      {selectedTodo && (
        <div className="hidden md:flex w-96 flex-shrink-0 h-full overflow-hidden">
          <TodoDetailPanel
            todo={selectedTodo}
            onClose={() => setSelectedTodoId(null)}
          />
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* Mobile Detail Drawer */}
      <MobileDetailDrawer
        todo={selectedTodo ?? null}
        onClose={() => setSelectedTodoId(null)}
      />
    </div>
  );
}
