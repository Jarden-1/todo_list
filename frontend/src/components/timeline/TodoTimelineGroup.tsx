import type { LucideIcon } from "lucide-react";
import type { Todo } from "../../lib/types";
import { CollapsibleGroupHeader } from "./CollapsibleGroupHeader";
import { TodoTimelineList } from "./TodoTimelineList";

interface TodoTimelineGroupProps {
  title: string;
  todos: Todo[];
  collapsed: boolean;
  onToggle: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  labelMode?: "time" | "relative";
  icon?: LucideIcon;
  iconClassName?: string;
  dotClassName?: string;
  titleClassName?: string;
  countClassName?: string;
}

export function TodoTimelineGroup({
  title,
  todos,
  collapsed,
  onToggle,
  selectedId,
  onSelect,
  labelMode = "time",
  icon,
  iconClassName,
  dotClassName,
  titleClassName,
  countClassName,
}: TodoTimelineGroupProps) {
  return (
    <section className="timeline-group-section">
      <CollapsibleGroupHeader
        title={title}
        collapsed={collapsed}
        onToggle={onToggle}
        countText={`${todos.length}`}
        icon={icon}
        iconClassName={iconClassName}
        dotClassName={dotClassName}
        titleClassName={titleClassName}
        countClassName={countClassName}
        className="timeline-group-header"
      />
      {!collapsed && (
        <div className="timeline-group-body">
          <TodoTimelineList
            todos={todos}
            selectedId={selectedId}
            onSelect={onSelect}
            labelMode={labelMode}
          />
        </div>
      )}
    </section>
  );
}
