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
  Plus,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { isOverdue, isTodayDate } from "../lib/dateUtils";
import { useTransientScrollbar } from "../hooks/useTransientScrollbar";
import { ProjectDeleteDialog } from "./ProjectDeleteDialog";
import type { Project } from "../lib/types";

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
  const { currentView, setCurrentView, todos, projects, addProject, deleteProject } = useTodo();
  const { theme, toggleTheme } = useTheme();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const navScroll = useTransientScrollbar<HTMLElement>();

  const handleProjectClick = (projectId: string) => {
    // Navigate to projects view and set filter
    onNavigate?.();
    setCurrentView("projects");
    onFilterProject(filterProjectId === projectId ? null : projectId);
  };

  const startCreateProject = () => {
    setProjectsExpanded(true);
    setCreatingProject(true);
    setNewProjectName("");
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) {
      setCreatingProject(false);
      return;
    }
    if (savingProject) return;
    setSavingProject(true);
    try {
      await addProject(name);
      setNewProjectName("");
      setCreatingProject(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "项目创建失败");
    } finally {
      setSavingProject(false);
    }
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
          <div className="group/projhdr flex items-center gap-1 pr-1">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex flex-1 items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-sidebar-foreground/52 uppercase tracking-widest hover:text-sidebar-foreground transition-colors rounded-lg hover:bg-white/24 dark:hover:bg-white/5"
            >
              {projectsExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              项目
            </button>
            <button
              onClick={startCreateProject}
              title="新建项目"
              aria-label="新建项目"
              className="flex-shrink-0 p-1 rounded-md text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-white/24 dark:hover:bg-white/5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {projectsExpanded && (
            <div className="mt-1 space-y-0.5">
              {creatingProject && (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleCreateProject();
                      if (event.key === "Escape") {
                        setCreatingProject(false);
                        setNewProjectName("");
                      }
                    }}
                    placeholder="项目名称…"
                    className="flex-1 min-w-0 bg-white/10 dark:bg-white/5 rounded-md px-2 py-1 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none focus:bg-white/20"
                  />
                  <button
                    onMouseDown={(event) => {
                      event.preventDefault();
                      void handleCreateProject();
                    }}
                    disabled={savingProject}
                    className="flex-shrink-0 p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                    aria-label="确认新建项目"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setCreatingProject(false);
                      setNewProjectName("");
                    }}
                    className="flex-shrink-0 p-1 text-sidebar-foreground/40 hover:text-sidebar-foreground"
                    aria-label="取消新建项目"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {projects.length === 0 && !creatingProject && (
                <button
                  onClick={startCreateProject}
                  className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-white/24 dark:hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新建项目
                </button>
              )}
              {projects.map((project) => {
                const count = todos.filter(
                  (t) =>
                    t.projectId === project.id &&
                    t.status !== "done" &&
                    t.status !== "cancelled"
                ).length;
                const isFiltered = filterProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    className={cn(
                      "group/proj-item nav-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer",
                      isFiltered
                        ? "nav-item-active font-medium"
                        : "text-sidebar-foreground/65 hover:bg-white/24 dark:hover:bg-white/5"
                    )}
                    onClick={() => handleProjectClick(project.id)}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(project);
                      }}
                      className="flex-shrink-0 opacity-0 group-hover/proj-item:opacity-100 p-0.5 rounded text-sidebar-foreground/40 hover:text-destructive transition-all"
                      aria-label={`删除项目 ${project.name}`}
                      title="删除项目"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
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

      <ProjectDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        project={deleteTarget}
        todoCount={
          deleteTarget
            ? todos.filter(
                (t) =>
                  t.projectId === deleteTarget.id &&
                  t.status !== "done" &&
                  t.status !== "cancelled"
              ).length
            : 0
        }
        onConfirm={async (mode) => {
          if (!deleteTarget) return;
          try {
            await deleteProject(deleteTarget.id, mode);
            toast.success(
              mode === "delete"
                ? `项目「${deleteTarget.name}」及其待办已删除`
                : `项目「${deleteTarget.name}」已删除，待办已移到未分配`
            );
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "删除项目失败");
            throw error;
          }
        }}
      />
    </aside>
  );
}
