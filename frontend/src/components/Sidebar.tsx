// SmartTodo - Sidebar Navigation
// Features: nav views, collapsible projects, theme toggle
import { useState } from "react";
import { useTodo } from "../contexts/TodoContext";
import { ViewType } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import {
  Sun,
  Clock,
  FolderOpen,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Moon,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "../lib/utils";
import { isOverdue, isTodayDate } from "../lib/dateUtils";
import { useTransientScrollbar } from "../hooks/useTransientScrollbar";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663756374270/DGd4eqCYayiLdVjVXhEfFj/logo-icon-9HsBNNDLVXMHKrpvu4gSPu.webp";

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getBadge?: (todos: ReturnType<typeof useTodo>["todos"]) => number | null;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "today",
    label: "今日待办",
    icon: Sun,
    getBadge: (todos) => {
      const count = todos.filter(
        (t) =>
          t.status !== "done" &&
          t.status !== "cancelled" &&
          (isTodayDate(t.dueAt) || isOverdue(t.dueAt))
      ).length;
      return count > 0 ? count : null;
    },
  },
  { id: "timeline", label: "按时间分类", icon: Clock },
  { id: "projects", label: "按项目分类", icon: FolderOpen },
  { id: "priority", label: "按优先级分类", icon: BarChart2 },
  {
    id: "completed",
    label: "已完成",
    icon: CheckCircle2,
    getBadge: (todos) => {
      const count = todos.filter((t) => t.status === "done").length;
      return count > 0 ? count : null;
    },
  },
];

interface SidebarProps {
  /** Currently filtered project id (null = all) */
  filterProjectId: string | null;
  onFilterProject: (id: string | null) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ filterProjectId, onFilterProject, onOpenSettings, onLogout, onNavigate }: SidebarProps) {
  const { currentView, setCurrentView, todos, projects } = useTodo();
  const { theme, toggleTheme } = useTheme();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const navScroll = useTransientScrollbar<HTMLElement>();

  const handleProjectClick = (projectId: string) => {
    // Navigate to projects view and set filter
    onNavigate?.();
    setCurrentView("projects");
    onFilterProject(filterProjectId === projectId ? null : projectId);
  };

  return (
    <aside className="app-sidebar w-56 h-full flex flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="sidebar-brand h-16 flex items-center gap-2.5 px-4">
        <img src={LOGO_URL} alt="SmartTodo" className="w-7 h-7 rounded-lg" />
        <div>
          <h1 className="text-sm font-bold text-sidebar-foreground font-display tracking-tight">
            SmartTodo
          </h1>
          <p className="text-[10px] text-sidebar-foreground/55">智能待办管理</p>
        </div>
      </div>

      {/* Navigation */}
      <nav
        ref={navScroll.ref}
        onScroll={navScroll.onScroll}
        className="flex-1 py-3 overflow-y-auto"
      >
        <div className="px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id && !filterProjectId;
            const badge = item.getBadge?.(todos);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate?.();
                  setCurrentView(item.id);
                  onFilterProject(null);
                }}
                className={cn(
                  "nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm",
                  isActive
                    ? "nav-item-active font-medium"
                    : "text-sidebar-foreground/65"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/50"
                  )}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {badge !== null && badge !== undefined && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-white/24 text-sidebar-foreground/55 dark:bg-white/5"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Projects section */}
        <div className="mt-4 px-2">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-sidebar-foreground/52 uppercase tracking-widest hover:text-sidebar-foreground transition-colors rounded-lg hover:bg-white/24 dark:hover:bg-white/5"
          >
            {projectsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            项目
          </button>

          {projectsExpanded && (
            <div className="mt-1 space-y-0.5">
              {projects.map((project) => {
                const count = todos.filter(
                  (t) =>
                    t.projectId === project.id &&
                    t.status !== "done" &&
                    t.status !== "cancelled"
                ).length;
                const isFiltered = filterProjectId === project.id;

                return (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project.id)}
                    className={cn(
                      "nav-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all",
                      isFiltered
                        ? "nav-item-active font-medium"
                        : "text-sidebar-foreground/65"
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color ?? "#6366F1" }}
                    />
                    <span className="flex-1 text-left truncate">{project.name}</span>
                    {count > 0 && (
                      <span className={cn(
                        "text-[10px]",
                        isFiltered ? "text-sidebar-foreground" : "text-sidebar-foreground/48"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer px-2 py-3 space-y-0.5">
        <button
          onClick={onOpenSettings}
          className="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/65"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          设置
        </button>
        <button
          onClick={toggleTheme}
          className="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/65"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Moon className="w-4 h-4 flex-shrink-0" />
          )}
          {theme === "dark" ? "切换亮色" : "切换暗色"}
        </button>
        <button
          onClick={onLogout}
          className="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/65"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
