import {
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useResizableHeight } from "../hooks/useResizableHeight";
import { cn } from "../lib/utils";
import { MarkdownToolbar } from "./markdown/MarkdownToolbar";
import type { MarkdownToolbarMode } from "./markdown/MarkdownToolbar";
import { useMarkdownEditorController } from "./markdown/useMarkdownEditorController";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  autoFocus?: boolean;
  showToolbar?: boolean;
  toolbarMode?: "auto" | MarkdownToolbarMode;
  fullscreen?: boolean;
  rich?: boolean;
  className?: string;
  toolbarClassName?: string;
  textareaClassName?: string;
  resizableY?: boolean;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => void;
  onAiOrganize?: () => void;
  aiLoading?: boolean;
  aiDisabled?: boolean;
  aiLabel?: string;
  showFullscreenToggle?: boolean;
  onToggleFullscreen?: () => void;
  fullscreenToggleLabel?: string;
  todoId?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 4,
  textareaRef,
  autoFocus,
  showToolbar = true,
  toolbarMode = "auto",
  fullscreen = false,
  rich = false,
  className,
  toolbarClassName,
  textareaClassName,
  resizableY = false,
  defaultHeight = 180,
  minHeight = 120,
  maxHeight = 520,
  onKeyDown,
  onAiOrganize,
  aiLoading,
  aiDisabled,
  aiLabel = "AI 整理",
  showFullscreenToggle,
  onToggleFullscreen,
  fullscreenToggleLabel,
  todoId,
}: MarkdownEditorProps) {
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = textareaRef ?? localTextareaRef;
  const richEditor = rich || fullscreen;
  const canResizeY = resizableY && !fullscreen;
  const resize = useResizableHeight({
    enabled: canResizeY,
    defaultHeight,
    minHeight,
    maxHeight,
  });
  const resolvedToolbarMode =
    !showToolbar || toolbarMode === "hidden"
      ? "hidden"
      : toolbarMode === "auto"
        ? fullscreen
          ? "full"
          : "minimal"
        : toolbarMode;
  const editor = useMarkdownEditorController({
    value,
    onChange,
    editorRef,
    richEditor,
    autoFocus,
    onKeyDown,
    todoId,
  });
  const hasFloatingActions =
    resolvedToolbarMode === "responsive" &&
    (Boolean(onAiOrganize) || Boolean(showFullscreenToggle && onToggleFullscreen));
  const floatingActionPadding = hasFloatingActions
    ? { paddingRight: "5rem", paddingBottom: "3.5rem" }
    : undefined;

  return (
    <div
      className={cn(
        "markdown-editor-container relative min-w-0",
        (fullscreen || canResizeY) && "flex min-h-0 flex-col",
        fullscreen && "flex-1",
        canResizeY && "markdown-editor-resizable overflow-hidden",
        hasFloatingActions && "markdown-editor-has-floating-actions",
        className
      )}
      style={resize.style}
    >
      <MarkdownToolbar
        mode={resolvedToolbarMode}
        fullscreen={fullscreen}
        toolbarClassName={toolbarClassName}
        emojiOpen={editor.emojiOpen}
        setEmojiOpen={editor.setEmojiOpen}
        headingOpen={editor.headingOpen}
        setHeadingOpen={editor.setHeadingOpen}
        insertText={editor.insertText}
        applyInline={editor.applyInline}
        applyHeading={editor.applyHeading}
        applyList={editor.applyList}
        applyTaskList={editor.applyTaskList}
        insertLink={editor.insertLink}
        openImagePicker={() => editor.imageInputRef.current?.click()}
        onAiOrganize={onAiOrganize}
        aiLoading={aiLoading}
        aiDisabled={aiDisabled}
        aiLabel={aiLabel}
        showFullscreenToggle={showFullscreenToggle}
        onToggleFullscreen={onToggleFullscreen}
        fullscreenToggleLabel={fullscreenToggleLabel}
      />

      {richEditor ? (
        <div
          ref={editor.richEditorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder}
          suppressContentEditableWarning
          onInput={editor.handleRichInput}
          onBlur={editor.handleRichBlur}
          onPaste={editor.handlePaste}
          onCompositionStart={editor.handleCompositionStart}
          onCompositionEnd={editor.handleCompositionEnd}
          onBeforeInput={editor.handleRichBeforeInput}
          onKeyDown={editor.handleRichKeyDown}
          onKeyUp={editor.handleRichSelectionSnapshot}
          onMouseUp={editor.handleRichSelectionSnapshot}
          data-empty={value.trim() ? undefined : "true"}
          style={floatingActionPadding}
          className={cn(
            "markdown-body markdown-rich-editor w-full min-w-0 bg-transparent text-foreground outline-none",
            (fullscreen || canResizeY) && "min-h-0 flex-1 overflow-y-auto",
            textareaClassName
          )}
        />
      ) : (
        <textarea
          ref={editorRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={editor.handlePlainKeyDown}
          onPaste={editor.handlePaste}
          autoFocus={autoFocus}
          placeholder={placeholder}
          rows={rows}
          style={floatingActionPadding}
          className={cn(
            "w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
            (fullscreen || canResizeY) && "min-h-0 flex-1 overflow-y-auto resize-none",
            textareaClassName
          )}
        />
      )}

      {canResizeY && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="调整编辑框高度"
          tabIndex={0}
          onPointerDown={resize.startResize}
          onKeyDown={resize.handleKeyDown}
          className="markdown-resize-y-handle"
        />
      )}

      <input
        ref={editor.imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          void editor.insertImageFiles(files);
        }}
      />
    </div>
  );
}
