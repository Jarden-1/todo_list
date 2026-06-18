import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SettingsCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
}

export function SettingsCard({
  title,
  description,
  icon: Icon,
  iconClassName,
  children,
}: SettingsCardProps) {
  return (
    <section className="settings-card">
      <div className="mb-5 flex items-start gap-3">
        <div className={cn("settings-card-icon", iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
