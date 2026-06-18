import { Maximize, Minimize, WandSparkles } from "lucide-react";
import { cn } from "../../lib/utils";
import { ToolbarButton } from "./ToolbarButton";
import type { MarkdownToolbarProps } from "./markdownToolbarTypes";

export function AiToolbarButton({
  onAiOrganize,
  aiDisabled,
  aiLoading,
  aiLabel,
  className,
}: Pick<MarkdownToolbarProps, "onAiOrganize" | "aiDisabled" | "aiLoading" | "aiLabel"> & {
  className?: string;
}) {
  if (!onAiOrganize) return null;

  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onAiOrganize}
      disabled={aiDisabled || aiLoading}
      aria-label={aiLabel}
      title={aiLabel}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary transition-colors",
        "hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40",
        className
      )}
    >
      {aiLoading ? (
        <span className="spinner h-4 w-4 rounded-full border-2 border-primary/25 border-t-primary" />
      ) : (
        <WandSparkles className="h-4 w-4" />
      )}
    </button>
  );
}

export function FullscreenToolbarButton({
  fullscreen,
  showFullscreenToggle,
  onToggleFullscreen,
  fullscreenToggleLabel,
  className,
}: Pick<
  MarkdownToolbarProps,
  "fullscreen" | "showFullscreenToggle" | "onToggleFullscreen" | "fullscreenToggleLabel"
> & {
  className?: string;
}) {
  if (!showFullscreenToggle || !onToggleFullscreen) return null;

  return (
    <ToolbarButton
      icon={fullscreen ? Minimize : Maximize}
      className={className}
      aria-label={fullscreenToggleLabel ?? (fullscreen ? "退出全屏" : "全屏编辑")}
      title={fullscreenToggleLabel ?? (fullscreen ? "退出全屏" : "全屏编辑")}
      onClick={onToggleFullscreen}
    />
  );
}
