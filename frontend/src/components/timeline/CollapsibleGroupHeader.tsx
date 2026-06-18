import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

interface CollapsibleGroupHeaderProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  countText?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  dotClassName?: string;
  titleClassName?: string;
  countClassName?: string;
  className?: string;
}

export function CollapsibleGroupHeader({
  title,
  collapsed,
  onToggle,
  countText,
  icon: Icon,
  iconClassName,
  dotClassName,
  titleClassName,
  countClassName,
  className,
}: CollapsibleGroupHeaderProps) {
  const Chevron = collapsed ? ChevronRight : ChevronDown;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className={cn("collapsible-group-header", className)}
    >
      <span className="collapsible-group-header-main">
        {Icon ? (
          <span className={cn("collapsible-group-header-icon", iconClassName)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className={cn("collapsible-group-header-dot", dotClassName)} />
        )}
        <span className={cn("collapsible-group-header-title", titleClassName)}>
          {title}
        </span>
        {countText && (
          <span className={cn("collapsible-group-header-count", countClassName)}>
            {countText}
          </span>
        )}
      </span>
      <Chevron className="collapsible-group-header-chevron h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform" />
    </button>
  );
}
