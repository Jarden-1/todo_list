// Assignee popover: tag-style multi-input with persisted recent history.
// Wraps FieldPopover + FieldButton + the popover body.
import { User, X } from "lucide-react";
import type { RefObject } from "react";
import { FieldPopover } from "./FieldPopover";
import { FieldButton } from "./FieldButton";
import { PopoverConfirmButton } from "./PopoverConfirmButton";

interface AssigneePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: () => void;
  assignees: string[];
  assigneeInput: string;
  recentAssignees: string[];
  onAssigneeInputChange: (value: string) => void;
  onAddAssignee: (name: string) => void;
  onRemoveAssignee: (index: number) => void;
  onRemoveRecentAssignee: (name: string) => void;
  containerRef?: RefObject<HTMLElement | null>;
}

export function AssigneePopover({
  open,
  onOpenChange,
  onToggle,
  assignees,
  assigneeInput,
  recentAssignees,
  onAssigneeInputChange,
  onAddAssignee,
  onRemoveAssignee,
  onRemoveRecentAssignee,
  containerRef,
}: AssigneePopoverProps) {
  return (
    <FieldPopover
      open={open}
      onOpenChange={onOpenChange}
      containerRef={containerRef}
      trigger={
        <FieldButton
          icon={User}
          label="参与人"
          active={open}
          value={assignees.length > 0 ? `${assignees.length} 人` : ""}
          onClick={onToggle}
        />
      }
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" /> 参与人
          </label>
          <PopoverConfirmButton onClick={() => onOpenChange(false)} />
        </div>
        {assignees.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {assignees.map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-foreground"
              >
                {name}
                <button
                  type="button"
                  onClick={() => onRemoveAssignee(index)}
                  className="text-muted-foreground/60 hover:text-destructive transition-colors"
                  aria-label={`移除 ${name}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          value={assigneeInput}
          onChange={(e) => onAssigneeInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddAssignee(assigneeInput);
              onAssigneeInputChange("");
            }
          }}
          placeholder="姓名 / 邮箱（Enter 添加）"
          className="field-input w-full"
        />
        {recentAssignees.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-muted-foreground">历史:</span>
            {recentAssignees.map((name) => (
              <span
                key={name}
                className="group/ra inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[11px] text-foreground"
              >
                <button
                  type="button"
                  onClick={() => onAddAssignee(name)}
                  className="hover:text-primary"
                >
                  {name}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveRecentAssignee(name)}
                  className="text-muted-foreground/50 hover:text-destructive"
                  aria-label={`删除历史人名 ${name}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </FieldPopover>
  );
}
