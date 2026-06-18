import { Switch } from "../ui/switch";
import { cn } from "../../lib/utils";

interface SettingsToggleRowProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  busy?: boolean;
}

export function SettingsToggleRow({
  checked,
  onCheckedChange,
  title,
  description,
  ariaLabel,
  disabled,
  className,
  busy,
}: SettingsToggleRowProps) {
  return (
    <div className={cn("settings-toggle-row", className)} aria-busy={busy || undefined}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={ariaLabel ?? title}
        className="h-6 w-11"
        disabled={disabled}
      />
    </div>
  );
}
