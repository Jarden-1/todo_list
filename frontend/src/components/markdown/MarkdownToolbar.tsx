import {
  Bold,
  Code2,
  Image as ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Strikethrough,
  Underline,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { AiToolbarButton, FullscreenToolbarButton } from "./ToolbarActions";
import { ToolbarButton } from "./ToolbarButton";
import { EmojiToolbarItem, HeadingToolbarItem } from "./ToolbarMenus";
import type { MarkdownToolbarProps, MarkdownToolbarMode } from "./markdownToolbarTypes";

export type { MarkdownToolbarMode };

function SourceModeToggle(props: MarkdownToolbarProps) {
  if (!props.onToggleSourceMode) return null;

  return (
    <button
      type="button"
      aria-label={props.sourceMode ? "关闭 Markdown 源码模式" : "开启 Markdown 源码模式"}
      aria-pressed={props.sourceMode}
      title={props.sourceMode ? "切换到富文本预览" : "切换到 Markdown 源码"}
      onMouseDown={(event) => event.preventDefault()}
      onClick={props.onToggleSourceMode}
      className={cn(
        "inline-flex h-7 flex-shrink-0 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors",
        props.sourceMode
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      <Code2 className="h-3.5 w-3.5" />
      {props.sourceMode ? "MD" : "富文本"}
    </button>
  );
}

function ToolbarFormatButtons({
  props,
  responsive = false,
}: {
  props: MarkdownToolbarProps;
  responsive?: boolean;
}) {
  return (
    <>
      <ToolbarButton
        icon={Bold}
        aria-label="加粗"
        title="加粗 Cmd/Ctrl+B"
        className={responsive ? "markdown-toolbar-format-item" : undefined}
        onClick={() => props.applyInline("bold", "**", "**")}
      />
      <ToolbarButton
        icon={Italic}
        aria-label="斜体"
        title="斜体 Cmd/Ctrl+I"
        className={responsive ? "markdown-toolbar-format-item" : undefined}
        onClick={() => props.applyInline("italic", "*", "*")}
      />
      <HeadingToolbarItem
        {...props}
        className={responsive ? "markdown-toolbar-format-item md-toolbar-hide-4" : undefined}
      />
      <ToolbarButton
        icon={Underline}
        aria-label="下划线"
        title="下划线 Cmd/Ctrl+U"
        className={responsive ? "markdown-toolbar-format-item md-toolbar-hide-1" : undefined}
        onClick={() => props.applyInline("underline", "<u>", "</u>")}
      />
      <ToolbarButton
        icon={Strikethrough}
        aria-label="删除线"
        title="删除线 Cmd/Ctrl+Shift+X"
        className={responsive ? "markdown-toolbar-format-item md-toolbar-hide-1" : undefined}
        onClick={() => props.applyInline("strikeThrough", "~~", "~~")}
      />
      <ToolbarButton
        icon={List}
        aria-label="无序列表"
        title="无序列表 Cmd/Ctrl+Shift+8"
        className={responsive ? "markdown-toolbar-format-item md-toolbar-hide-3" : undefined}
        onClick={() => props.applyList(false)}
      />
      <ToolbarButton
        icon={ListOrdered}
        aria-label="有序列表"
        title="有序列表 Cmd/Ctrl+Shift+7"
        className={responsive ? "markdown-toolbar-format-item md-toolbar-hide-2" : undefined}
        onClick={() => props.applyList(true)}
      />
      <ToolbarButton
        icon={ListTodo}
        aria-label="待办清单"
        title="待办清单 Cmd/Ctrl+Shift+9"
        className={responsive ? "markdown-toolbar-format-item md-toolbar-hide-2" : undefined}
        onClick={props.applyTaskList}
      />
      <ToolbarButton
        icon={Link}
        aria-label="插入链接"
        title="插入链接 Cmd/Ctrl+K"
        className={responsive ? "markdown-toolbar-format-item md-toolbar-hide-5" : undefined}
        onClick={props.insertLink}
      />
      <ToolbarButton
        icon={ImageIcon}
        aria-label="插入图片"
        title="插入图片"
        className={responsive ? "markdown-toolbar-format-item md-toolbar-hide-6" : undefined}
        onClick={props.openImagePicker}
      />
    </>
  );
}

function MinimalToolbar(props: MarkdownToolbarProps) {
  const hasActions = props.onAiOrganize || (props.showFullscreenToggle && props.onToggleFullscreen);
  const hasSourceToggle = Boolean(props.onToggleSourceMode);
  if (!hasActions && !hasSourceToggle) return null;

  return (
    <div className={cn("flex shrink-0 items-center gap-1 px-2.5 pt-2", props.toolbarClassName)}>
      <SourceModeToggle {...props} />
      <div className="ml-auto" />
      <AiToolbarButton {...props} className="h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5" />
      <FullscreenToolbarButton {...props} className="h-7 w-7" />
    </div>
  );
}

function ResponsiveToolbar(props: MarkdownToolbarProps) {
  // NOTE: the AI / fullscreen actions are intentionally NOT rendered here.
  // They live as a sibling of the toolbar in MarkdownEditor so they can be
  // absolutely positioned at the editor container's bottom-right (the
  // container is full-height + relative), instead of being anchored to this
  // short toolbar row — which caused them to sit at the top and overlap.
  return (
    <div className={cn("markdown-toolbar-responsive", props.toolbarClassName)}>
      <div className="markdown-toolbar-format-group">
        <SourceModeToggle {...props} />
        {!props.sourceMode && (
          <>
            <EmojiToolbarItem {...props} className="markdown-toolbar-format-item" />
            <ToolbarFormatButtons props={props} responsive />
          </>
        )}
      </div>
    </div>
  );
}

function FullToolbar(props: MarkdownToolbarProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-10 shrink-0 items-center gap-1 bg-card/95 px-2 py-1 text-sm",
        props.toolbarClassName
      )}
    >
      <SourceModeToggle {...props} />
      {!props.sourceMode && (
        <>
          <EmojiToolbarItem {...props} />
          <ToolbarFormatButtons props={props} />
        </>
      )}

      {props.onAiOrganize && (
        <>
          <span className="mx-1 h-5 w-px bg-border/70" />
          <AiToolbarButton {...props} />
        </>
      )}

      <div className="ml-auto" />
      <FullscreenToolbarButton {...props} />
    </div>
  );
}

export function MarkdownToolbar(props: MarkdownToolbarProps) {
  if (props.mode === "hidden") return null;
  if (props.mode === "minimal") return <MinimalToolbar {...props} />;
  if (props.mode === "responsive") return <ResponsiveToolbar {...props} />;
  return <FullToolbar {...props} />;
}
