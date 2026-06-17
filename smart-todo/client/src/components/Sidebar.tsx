// SmartTodo - Sidebar Navigation
// Features: nav views, collapsible projects (click to filter), theme toggle, settings link
import { useState } from "react";
import { useTodo } from "../contexts/TodoContext";
import { ViewType } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import {
  Sun,
  Clock,
  FolderOpen,
  BarChart2,
  CheckCircle2,
  Zap,
  ChevronDown,
  ChevronRight,
  Settings,
  Moon,
  LogOut,
} from "lucide-react";
import { cn } from "../lib/utils";
import { isOverdue, isTodayDate } from "../lib/dateUtils";

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
    label: "今日",
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
  { id: "timeline", label: "时间轴", icon: Clock },
  { id: "projects", label: "项目", icon: FolderOpen },
  { id: "priority", label: "优先级", icon: BarChart2 },
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
}

export function Sidebar({ filterProjectId, onFilterProject }: SidebarProps) {
  const { currentView, setCurrentView, todos, projects } = useTodo();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const handleProjectClick = (projectId: string) => {
    // Navigate to projects view and set filter
    setCurrentView("projects");
    onFilterProject(filterProjectId === projectId ? null : projectId);
  };

  return (
    <aside className="w-56 h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <img src={LOGO_URL} alt="SmartTodo" className="w-7 h-7 rounded-lg" />
        <div>
          <h1 className="text-sm font-bold text-sidebar-foreground font-display tracking-tight">
            SmartTodo
          </h1>
          <p className="text-[10px] text-muted-foreground">智能待办管理</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id && !filterProjectId;
            const badge = item.getBadge?.(todos);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  onFilterProject(null);
                }}
                className={cn(
                  "nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm",
                  isActive
                    ? "nav-item-active font-medium"
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {badge !== null && badge !== undefined && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
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
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors rounded-lg hover:bg-muted"
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
                        : "text-muted-foreground"
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
                        isFiltered ? "text-primary" : "text-muted-foreground"
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
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        {/* AI status */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-5 h-5 rounded-md brand-gradient flex items-center justify-center flex-shrink-0">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-foreground">AI 已就绪</p>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Moon className="w-4 h-4 flex-shrink-0" />
          )}
          {theme === "dark" ? "切换亮色" : "切换暗色"}
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate("/settings")}
          className="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          设置
        </button>

        {/* User */}
        {user && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-5 h-5 rounded-full brand-gradient flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <span className="flex-1 text-[11px] text-muted-foreground truncate">{user.name}</span>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="退出登录"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
