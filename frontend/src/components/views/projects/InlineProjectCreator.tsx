// Inline "new project" creator: a button that toggles into an input row.
import { Plus, X } from "lucide-react";

interface InlineProjectCreatorProps {
  show: boolean;
  value: string;
  onShowChange: (show: boolean) => void;
  onValueChange: (value: string) => void;
  onCreate: () => void;
}

export function InlineProjectCreator({
  show,
  value,
  onShowChange,
  onValueChange,
  onCreate,
}: InlineProjectCreatorProps) {
  if (show) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreate();
            if (e.key === "Escape") onShowChange(false);
          }}
          placeholder="项目名称…"
          className="field-input w-36"
        />
        <button
          onClick={onCreate}
          className="text-xs text-primary hover:text-primary/80 px-2 py-1.5 rounded-lg bg-primary/10 transition-colors"
        >
          创建
        </button>
        <button
          onClick={() => onShowChange(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => onShowChange(true)}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <Plus className="w-3.5 h-3.5" />
      新建项目
    </button>
  );
}
