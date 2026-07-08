// SmartTodo - Main Home Page
// Desktop: Left sidebar + Main content + Right detail panel (responsive)
// Mobile: Top header + Main content + Bottom nav + Detail drawer
import { useEffect, useRef, useState } from "react";
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
import { isTodayDate } from "../lib/dateUtils";
import { Sun, Clock, FolderOpen, BarChart2, CheckCircle2, Menu, X } from "lucide-react";
import { cn } from "../lib/utils";
import { useTransientScrollbar } from "../hooks/useTransientScrollbar";
import { useDetailPanelLayout } from "../hooks/useDetailPanelLayout";

const VIEW_CONFIG = {
  today: { title: "今日待办", subtitle: "今天需要处理的任务", icon: Sun, iconColor: "text-amber-500" },
  timeline: { title: "按时间分类", subtitle: "按时间维度管理任务节奏", icon: Clock, iconColor: "text-primary" },
  projects: { title: "按项目分类", subtitle: "查看每个项目的推进情况", icon: FolderOpen, iconColor: "text-emerald-500" },
  priority: { title: "按优先级分类", subtitle: "聚焦高价值和紧急事项", icon: BarChart2, iconColor: "text-violet-500" },
  completed: { title: "已完成", subtitle: "归档与回顾已完成的任务", icon: CheckCircle2, iconColor: "text-emerald-500" },
};

interface HomeProps {
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function Home({ onOpenSettings, onLogout }: HomeProps) {
  const { currentView, selectedTodoId, setSelectedTodoId, todos } = useTodo();
  const selectedTodo = todos.find((t) => t.id === selectedTodoId);
  const viewConfig = VIEW_CONFIG[currentView];
  const Icon = viewConfig.icon;

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const mainScroll = useTransientScrollbar<HTMLDivElement>();
  const {
    isDesktop,
    detailPanelOpen,
    detailPanelRendered,
    detailPanelStyle,
    renderedDetailTodo,
    isDetailResizing,
    closeDetailPanel,
    clearCloseDetailTimer,
    startDetailResize,
  } = useDetailPanelLayout({
    selectedTodo,
    selectedTodoId,
    setSelectedTodoId,
  });

  const activeTodosCount = todos.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  ).length;

  // Auto-select the first todo of a view when the user switches to it, so the
  // detail panel opens by default. Once the user manually selects (or closes)
  // a todo we stop auto-selecting for that view — the flag resets on the next
  // view switch.
  const viewAutoSelectedRef = useRef(false);
  useEffect(() => {
    viewAutoSelectedRef.current = false;
  }, [currentView]);

  useEffect(() => {
    if (viewAutoSelectedRef.current) return;
    // "按项目分类" 和 "已完成" 不自动展开侧边栏 — 项目分类用户通常想先
    // 浏览项目组结构,已完成列表则偏向快速扫一眼,展开侧边栏反而打扰。
    if (currentView === "projects" || currentView === "completed") {
      setSelectedTodoId(null);
      viewAutoSelectedRef.current = true;
      return;
    }
    const visible = todos.filter((t) => !t.deletedAt);
    let candidates = visible;
    if (currentView === "today") {
      candidates = visible.filter(
        (t) =>
          t.status !== "done" &&
          t.status !== "cancelled" &&
          isTodayDate(t.dueAt)
      );
    } else {
      candidates = visible.filter(
        (t) => t.status !== "done" && t.status !== "cancelled"
      );
    }
    // Earliest due date first; todos without a due date sink to the bottom.
    const sorted = [...candidates].sort((a, b) => {
      const at = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
    if (sorted.length > 0) {
      viewAutoSelectedRef.current = true;
      setSelectedTodoId(sorted[0].id);
    } else {
      setSelectedTodoId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, todos]);

  const handleSelectTodo = (id: string) => {
    viewAutoSelectedRef.current = true;
    if (selectedTodoId === id) {
      closeDetailPanel();
      return;
    }

    clearCloseDetailTimer();
    setSelectedTodoId(id);
  };

  const renderViewContent = () => {
    if (currentView === "today") {
      return <TodayView selectedId={selectedTodoId} onSelect={handleSelectTodo} />;
    }

    if (currentView === "timeline") {
      return <TimelineView selectedId={selectedTodoId} onSelect={handleSelectTodo} />;
    }

    if (currentView === "projects") {
      return (
        <ProjectsView
          selectedId={selectedTodoId}
          onSelect={handleSelectTodo}
          filterProjectId={filterProjectId}
        />
      );
    }

    if (currentView === "priority") {
      return <PriorityView selectedId={selectedTodoId} onSelect={handleSelectTodo} />;
    }

    if (currentView === "completed") {
      return <CompletedView selectedId={selectedTodoId} onSelect={handleSelectTodo} />;
    }

    return null;
  };

  return (
    <div className="flex h-screen bg-sidebar overflow-hidden">
      {/* Desktop Left Sidebar */}
      <div className="hidden md:flex h-full">
        <Sidebar
          filterProjectId={filterProjectId}
          onFilterProject={setFilterProjectId}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
          onNavigate={closeDetailPanel}
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
              onNavigate={closeDetailPanel}
              onOpenSettings={() => {
                setMobileSidebarOpen(false);
                onOpenSettings();
              }}
              onLogout={() => {
                setMobileSidebarOpen(false);
                onLogout();
              }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="app-main-panel flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Top header */}
        <header className="app-main-header h-16 flex items-center justify-between px-4 md:px-6 flex-shrink-0 bg-background/95 backdrop-blur">
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

        {/* Add composer — hidden on the completed view, which has its own
         * search box instead. */}
        {currentView !== "completed" && (
          <div className="px-4 md:px-6 pt-4 pb-3 flex-shrink-0">
            <AddTodoComposer onTodoCreated={(id) => setSelectedTodoId(id)} />
          </div>
        )}

        {/* View content */}
        <div
          ref={mainScroll.ref}
          onScroll={mainScroll.onScroll}
          onMouseDown={(event) => {
            // Click on empty space (not a todo card or interactive element)
            // collapses the detail panel — matches the "click outside to close"
            // mental model users expect from a side panel.
            if (!selectedTodoId) return;
            const target = event.target as HTMLElement;
            if (target.closest(".todo-card")) return;
            if (target.closest("button, a, select, input, textarea, [role='button']")) return;
            closeDetailPanel();
          }}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-6 pb-20 md:pb-6"
        >
          <div className="pt-2 pb-4">
            {renderViewContent()}
          </div>
        </div>
      </div>

      {/* Desktop Right detail panel */}
      {detailPanelRendered && renderedDetailTodo && isDesktop && (
        <div
          className={cn(
            "detail-panel-shell hidden md:flex relative flex-shrink-0 h-full",
            isDetailResizing && "detail-panel-shell-resizing"
          )}
          data-state={detailPanelOpen ? "open" : "closed"}
          style={detailPanelStyle}
        >
          <div
            onPointerDown={startDetailResize}
            className={cn(
              "absolute -left-1 top-0 z-10 h-full w-2 cursor-col-resize group transition-opacity",
              detailPanelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-label="调整详情宽度"
            role="separator"
          >
            <div className="absolute left-1/2 top-0 h-full w-px bg-transparent group-hover:bg-primary/50 transition-colors" />
          </div>
          <div className="detail-panel-clip h-full overflow-hidden">
            <div className="detail-panel-inner">
              <TodoDetailPanel
                todo={renderedDetailTodo}
                onClose={closeDetailPanel}
              />
            </div>
          </div>
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
