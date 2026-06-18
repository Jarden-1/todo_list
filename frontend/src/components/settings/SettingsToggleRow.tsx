import { Switch } from "../ui/switch";

interface SettingsToggleRowProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description: string;
  ariaLabel?: string;
}

export function SettingsToggleRow({
  checked,
  onCheckedChange,
  title,
  description,
  ariaLabel,
}: SettingsToggleRowProps) {
  return (
    <div className="settings-toggle-row">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={ariaLabel ?? title}
        className="h-6 w-11"
      />
    </div>
  );
}
