import { Edit3, List } from "lucide-react";
import { cn } from "../../lib/utils";

export type ComposerMode = "compose" | "fields";

interface ComposerModeSwitchProps {
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
}

export function ComposerModeSwitch({ mode, onModeChange }: ComposerModeSwitchProps) {
  return (
    <div className="absolute right-4 top-4 z-20 flex items-center gap-1">
      <button
        onClick={() => onModeChange("compose")}
        className={cn(
          "p-1.5 rounded-lg transition-all",
          mode === "compose"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="智能编辑"
        aria-label="智能编辑"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onModeChange("fields")}
        className={cn(
          "p-1.5 rounded-lg transition-all",
          mode === "fields"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="手动添加"
        aria-label="手动添加"
      >
        <List className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
