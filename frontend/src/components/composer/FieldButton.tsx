// A single field button in the composer's bottom row. Uses onMouseDown
// preventDefault to keep the markdown editor's caret alive when clicked.
import { cn } from "../../lib/utils";

interface FieldButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  value: string;
  emptyLabel?: string;
  onClick: () => void;
}

export function FieldButton({ icon: Icon, label, active, value, emptyLabel, onClick }: FieldButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Keep the markdown editor's caret alive when the user clicks a field
      // button. Without this, the button steals focus on mousedown and the
      // editor caret disappears — the user has to click the editor again to
      // resume typing. The onClick handler still fires normally.
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : value
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      <Icon className="w-3 h-3" />
      {value ? (
        <span className="max-w-[80px] truncate">{value}</span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

export type { FieldButtonProps };
