import { LogOut, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { SettingsDataActions } from "./SettingsDataActions";

interface SettingsSidePanelProps {
  onLogout: () => void;
}

export function SettingsSidePanel({ onLogout }: SettingsSidePanelProps) {
  const { user } = useAuth();
  const displayName = user?.displayName || user?.loginName || "SmartTodo 用户";
  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  return (
    <aside className="glass-card overflow-hidden rounded-lg lg:sticky lg:top-20">
      <section className="p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-bold text-foreground">账户</h2>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full brand-gradient text-base font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.loginName ?? "未登录"}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-destructive/75 transition-colors hover:bg-destructive/8 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            退出
          </button>
        </div>
        <SettingsDataActions />
      </section>
    </aside>
  );
}
