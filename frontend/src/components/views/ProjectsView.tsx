// SmartTodo - Projects View
// Supports filterProjectId from sidebar project click
import { useState } from "react";
import { useTodo } from "../../contexts/TodoContext";
import { TodoCard } from "../TodoCard";
import { FolderOpen, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { sortTodosByDueTime } from "../../lib/todoSort";

export interface ProjectsViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterProjectId?: string | null;
}

export function ProjectsView({ selectedId, onSelect, filterProjectId }: ProjectsViewProps) {
  const { todos, projects, addProject } = useTodo();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      addProject(newProjectName.trim());
      setNewProjectName("");
      setShowNewProject(false);
      toast.success(`项目「${newProjectName}」已创建`);
    }
  };

  const allGroups = [
    ...projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color ?? "#6366F1",
      todos: todos.filter(
        (t) => t.projectId === p.id && t.status !== "done" && t.status !== "cancelled"
      ),
      doneTodos: todos.filter((t) => t.projectId === p.id && t.status === "done"),
    })),
    {
      id: "unassigned",
      name: "未分配项目",
      color: "#94A3B8",
      todos: todos.filter(
        (t) => !t.projectId && t.status !== "done" && t.status !== "cancelled"
      ),
      doneTodos: todos.filter((t) => !t.projectId && t.status === "done"),
    },
  ];

  // If a project filter is active, only show that project
  const projectGroups = filterProjectId
    ? allGroups.filter((g) => g.id === filterProjectId)
    : allGroups;

  return (
    <div className="space-y-4">
      {/* Filter indicator */}
      {filterProjectId && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            仅显示：
            <span className="font-medium text-foreground ml-1">
              {allGroups.find((g) => g.id === filterProjectId)?.name}
            </span>
          </span>
        </div>
      )}

      {/* Add project button */}
      <div className="flex justify-end">
        {showNewProject ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddProject();
                if (e.key === "Escape") setShowNewProject(false);
              }}
              placeholder="项目名称…"
              className="field-input w-36"
            />
            <button
              onClick={handleAddProject}
              className="text-xs text-primary hover:text-primary/80 px-2 py-1.5 rounded-lg bg-primary/10 transition-colors"
            >
              创建
            </button>
            <button
              onClick={() => setShowNewProject(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            新建项目
          </button>
        )}
      </div>

      {projectGroups.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const total = group.todos.length + group.doneTodos.length;
        const progress = total > 0 ? (group.doneTodos.length / total) * 100 : 0;

        return (
          <section
            key={group.id}
            className="project-group border-l border-border/45 pl-4"
            style={{ borderLeftColor: `${group.color}55` }}
          >
            {/* Project header */}
            <button
              onClick={() => toggleCollapse(group.id)}
              className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/45 transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex-1 text-left text-sm font-semibold text-foreground">
                {group.name}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: group.color }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {group.doneTodos.length}/{total}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {group.todos.length} 未完成
                </span>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Todo list */}
            {!isCollapsed && (
              <div className="space-y-2 pl-5 pt-1">
                {group.todos.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    暂无待办
                  </p>
                ) : (
                  sortTodosByDueTime(group.todos).map((todo) => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      isSelected={selectedId === todo.id}
                      onClick={() => onSelect(todo.id)}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
