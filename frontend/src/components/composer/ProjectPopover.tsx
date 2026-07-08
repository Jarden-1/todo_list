// Project popover: list of project options (custom button list — native
// `<select>` would close the popover when picking an option, which doesn't
// match the "select → 确定" commit pattern used by the rest of the composer).
// Supports inline new-project creation and delete via a small action row.
import { Check, FolderOpen, Trash2, X } from "lucide-react";
import type { RefObject } from "react";
import type { Project } from "../../lib/types";
import { cn } from "../../lib/utils";
import { FieldPopover } from "./FieldPopover";
import { FieldButton } from "./FieldButton";
import { PopoverConfirmButton } from "./PopoverConfirmButton";

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
  containerRef?: RefObject<HTMLElement | null>;
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
  containerRef,
}: ProjectPopoverProps) {
  // "确定" closes the popover; if the user is mid-way through creating a
  // project, the button also commits the new name first. An empty name
  // just cancels the inline create and closes.
  const handleConfirm = () => {
    if (isCreatingProject && newProjectName.trim()) {
      onCreateProject();
    }
    onOpenChange(false);
  };

  return (
    <FieldPopover
      open={open}
      onOpenChange={onOpenChange}
      containerRef={containerRef}
      className="min-w-[240px]"
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
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <FolderOpen className="w-3 h-3" /> 项目
          </label>
          <PopoverConfirmButton onClick={handleConfirm} />
        </div>

        {/* Custom project list — picking an option does NOT close the
            popover, the user clicks "确定" to commit and close.
            A fixed-width leading slot keeps the label column aligned
            whether or not the row shows a checkmark. */}
        <div className="max-h-[180px] overflow-y-auto rounded-lg border border-border/45 bg-background/60">
          <ProjectOption
            selected={!projectId}
            onClick={() => onProjectSelect("")}
            label="未分配"
          />
          {projects.map((project) => (
            <ProjectOption
              key={project.id}
              selected={projectId === project.id}
              onClick={() => onProjectSelect(project.id)}
              label={project.name}
            />
          ))}
          <button
            type="button"
            onClick={() => onProjectSelect(NEW_PROJECT_VALUE)}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <span className="w-3 h-3 flex-shrink-0" aria-hidden />
            + 新建项目…
          </button>
        </div>

        {projectId && selectedProject && (
          <button
            type="button"
            onClick={onDeleteProject}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3 h-3" /> 删除当前项目「{selectedProject.name}」
          </button>
        )}

        {isCreatingProject && (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => onNewProjectNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCreateProject();
                }
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
              title="确认新建项目"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onCancelCreate}
              className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground"
              aria-label="取消"
              title="取消新建"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </FieldPopover>
  );
}

interface ProjectOptionProps {
  selected: boolean;
  onClick: () => void;
  label: string;
}

function ProjectOption({ selected, onClick, label }: ProjectOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors",
        selected
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground hover:bg-muted/60"
      )}
    >
      <span className="w-3 h-3 flex-shrink-0 flex items-center justify-center">
        {selected && <Check className="w-3 h-3" />}
      </span>
      {label}
    </button>
  );
}
