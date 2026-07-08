// Project group header: collapse toggle, todo count, inline rename,
// batch-select button, and the "more" dropdown (rename / delete).
// Note: ProjectsView is the active-todo workspace — completed items live
// in the dedicated "已完成" view, so this header doesn't show a completion
// progress bar or done count.
import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import type { Project } from "../../../lib/types";

export interface ProjectGroupData {
  id: string;
  name: string;
  color: string;
  todoCount: number;
}

interface ProjectGroupHeaderProps {
  group: ProjectGroupData;
  collapsed: boolean;
  selectionMode: boolean;
  allSelected: boolean;
  renaming: boolean;
  renameValue: string;
  savingRename: boolean;
  projectData: Project | null;
  onToggleCollapse: () => void;
  onSelectGroup: () => void;
  onStartRename: () => void;
  onRenameValueChange: (value: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
  onDeleteProject: () => void;
}

export function ProjectGroupHeader({
  group,
  collapsed,
  selectionMode,
  allSelected,
  renaming,
  renameValue,
  savingRename,
  projectData,
  onToggleCollapse,
  onSelectGroup,
  onStartRename,
  onRenameValueChange,
  onRenameConfirm,
  onRenameCancel,
  onDeleteProject,
}: ProjectGroupHeaderProps) {
  return (
    <div className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/45 transition-colors">
      {renaming ? (
        <div className="flex flex-1 items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: group.color }}
          />
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameConfirm();
              if (e.key === "Escape") onRenameCancel();
            }}
            className="flex-1 min-w-0 rounded-md border border-primary/40 bg-background px-2 py-1 text-sm font-semibold text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onRenameConfirm();
            }}
            disabled={savingRename}
            className="flex-shrink-0 p-1 text-emerald-500 hover:text-emerald-400 disabled:opacity-40"
            aria-label="确认重命名"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onRenameCancel();
            }}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground"
            aria-label="取消重命名"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.color }}
            />
            <span className="min-w-0 flex-shrink truncate text-sm font-semibold text-foreground">
              {group.name}
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
              {group.todoCount} 项
            </span>
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </button>
          <button
            type="button"
            disabled={group.todoCount === 0}
            onClick={onSelectGroup}
            className="rounded-lg px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {allSelected ? "取消全选" : selectionMode ? "全选本组" : "选择"}
          </button>
          {projectData && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                  aria-label="项目操作"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onStartRename}>
                  <Edit3 className="w-3.5 h-3.5 mr-2" />
                  重命名
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDeleteProject}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  删除项目
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </div>
  );
}
