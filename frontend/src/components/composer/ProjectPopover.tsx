// Project popover: select existing, create new inline, or delete current.
import { Check, FolderOpen, Trash2, X } from "lucide-react";
import type { Project } from "../../lib/types";
import { FieldPopover } from "./FieldPopover";
import { FieldButton } from "./FieldButton";

export const NEW_PROJECT_VALUE = "__new_project__";

interface ProjectPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: () => void;
  projectId: string;
  projects: Project[];
  selectedProject: Project | undefined;
  isCreatingProject: boolean;
  newProjectName: string;
  onProjectSelect: (value: string) => void;
  onCreateProject: () => void;
  onNewProjectNameChange: (value: string) => void;
  onCancelCreate: () => void;
  onDeleteProject: () => void;
}

export function ProjectPopover({
  open,
  onOpenChange,
  onToggle,
  projectId,
  projects,
  selectedProject,
  isCreatingProject,
  newProjectName,
  onProjectSelect,
  onCreateProject,
  onNewProjectNameChange,
  onCancelCreate,
  onDeleteProject,
}: ProjectPopoverProps) {
  return (
    <FieldPopover
      open={open}
      onOpenChange={onOpenChange}
      className="min-w-[260px]"
      trigger={
        <FieldButton
          icon={FolderOpen}
          label="项目"
          active={open}
          value={selectedProject?.name ?? ""}
          emptyLabel="未分配"
          onClick={onToggle}
        />
      }
    >
      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <FolderOpen className="w-3 h-3" /> 项目
        </label>
        <div className="flex items-center gap-1">
          <select
            value={projectId || (isCreatingProject ? NEW_PROJECT_VALUE : "")}
            onChange={(e) => onProjectSelect(e.target.value)}
            className="field-input flex-1 min-w-0"
          >
            <option value="">未分配</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
            <option value={NEW_PROJECT_VALUE}>+ 新建项目…</option>
          </select>
          {projectId && selectedProject && (
            <button
              type="button"
              onClick={onDeleteProject}
              className="flex-shrink-0 p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
              aria-label="删除当前项目"
              title="删除项目"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {isCreatingProject && (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => onNewProjectNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreateProject();
              }}
              placeholder="新项目名称…"
              className="field-input flex-1 min-w-0"
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onCreateProject();
              }}
              className="flex-shrink-0 p-1 text-emerald-500 hover:text-emerald-400"
              aria-label="确认新建项目"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onCancelCreate}
              className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground"
              aria-label="取消"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </FieldPopover>
  );
}
