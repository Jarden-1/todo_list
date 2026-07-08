// A single day group in the completed view: collapsible header (date label,
// count, per-day delete) + the list of CompletedTodoCard items when expanded.
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CheckCircle2, CheckSquare, ChevronDown, ChevronRight, Square, Trash2 } from "lucide-react";
import { CompletedTodoCard } from "./CompletedTodoCard";
import type { Todo } from "../../../lib/types";

interface CompletedDayGroupProps {
  dateKey: string;
  list: Todo[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  multiSelect: boolean;
  dayChecked: boolean;
  onToggleDay: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPendingDeleteDay: (label: string, ids: string[]) => void;
  onUncomplete: (todo: Todo) => void;
  onHardDelete: (todo: Todo) => void;
  onClearSelection: () => void;
  onRestored: (id: string) => void;
  onDuplicated: (todo: Todo) => void;
}

export function CompletedDayGroup({
  dateKey,
  list,
  collapsed,
  onToggleCollapse,
  multiSelect,
  dayChecked,
  onToggleDay,
  selectedId,
  onSelect,
  onPendingDeleteDay,
  onUncomplete,
  onHardDelete,
  onClearSelection,
  onRestored,
  onDuplicated,
}: CompletedDayGroupProps) {
  const date = parseISO(dateKey);
  const label = format(date, "M月d日 EEEE", { locale: zhCN });

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {multiSelect && (
          <button
            type="button"
            onClick={onToggleDay}
            className="flex items-center text-muted-foreground hover:text-primary transition-colors"
            aria-label={dayChecked ? `取消选择 ${label}` : `选择 ${label}`}
          >
            {dayChecked ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={collapsed ? `展开 ${label}` : `折叠 ${label}`}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground/50">{list.length} 项</span>
        </button>
        {!multiSelect && (
          <button
            type="button"
            onClick={() => onPendingDeleteDay(label, list.map((t) => t.id))}
            className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            title={`删除 ${label} 的全部已完成`}
          >
            <Trash2 className="w-3 h-3" /> 删除当天
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="space-y-2">
          {list.map((todo) => (
            <CompletedTodoCard
              key={todo.id}
              todo={todo}
              isSelected={selectedId === todo.id}
              onSelect={onSelect}
              onUncomplete={onUncomplete}
              onHardDelete={onHardDelete}
              onClearSelection={onClearSelection}
              onRestored={onRestored}
              onDuplicated={onDuplicated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
