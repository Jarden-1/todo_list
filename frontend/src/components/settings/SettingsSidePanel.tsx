import { Database, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../../contexts/SettingsContext";

interface SettingsSidePanelProps {
  onLogout: () => void;
}

export function SettingsSidePanel({ onLogout }: SettingsSidePanelProps) {
  const { resetSettings } = useSettings();

  return (
    <aside className="glass-card overflow-hidden rounded-lg lg:sticky lg:top-20">
      <section className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-bold text-foreground">账户</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full brand-gradient font-bold text-white">J</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Jarden</p>
            <p className="truncate text-[11px] text-muted-foreground">demo@smarttodo.app</p>
          </div>
        </div>
        <button onClick={onLogout} className="mt-4 flex items-center gap-2 text-xs text-destructive hover:text-destructive/80">
          <LogOut className="h-3.5 w-3.5" />
          退出登录
        </button>
      </section>

      <section className="border-t border-border/50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-bold text-foreground">数据</h2>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">恢复默认设置</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">不清空待办。</p>
          </div>
          <button
            onClick={() => {
              resetSettings();
              toast.success("设置已恢复默认");
            }}
            className="rounded-lg bg-muted px-3 py-2 text-xs text-foreground hover:bg-muted/80"
          >
            重置
          </button>
        </div>
      </section>
    </aside>
  );
}
