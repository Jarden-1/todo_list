import { Maximize, Plus, X } from "lucide-react";
import type { KeyboardEvent, RefObject } from "react";
import { cn } from "../../lib/utils";

interface CollapsedComposerProps {
  value: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  hasInput: boolean;
  onChange: (value: string) => void;
  onExpand: () => void;
  onClear: () => void;
  onOpenFullscreen: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function CollapsedComposer({
  value,
  textareaRef,
  hasInput,
  onChange,
  onExpand,
  onClear,
  onOpenFullscreen,
  onKeyDown,
}: CollapsedComposerProps) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center">
        <Plus className="w-4 h-4 text-muted-foreground" />
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          if (event.target.value) onExpand();
        }}
        onFocus={onExpand}
        onKeyDown={onKeyDown}
        placeholder="写下待办内容，支持 Markdown，或使用 AI 整理…"
        rows={1}
        className={cn(
          "flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground",
          "resize-none outline-none leading-relaxed",
          "min-h-[24px]"
        )}
      />
      <button
        onClick={onOpenFullscreen}
        className="flex-shrink-0 mt-0.5 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="全屏输入"
        title="全屏输入"
      >
        <Maximize className="w-4 h-4" />
      </button>
      {hasInput && (
        <button
          onClick={onClear}
          className="flex-shrink-0 mt-0.5 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="清空输入"
          title="清空输入"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
