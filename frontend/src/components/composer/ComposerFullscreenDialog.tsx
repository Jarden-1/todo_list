import type { KeyboardEvent, RefObject } from "react";
import { MarkdownEditor } from "../MarkdownEditor";

interface ComposerFullscreenDialogProps {
  value: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  hasInput: boolean;
  aiLoading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => void;
  onAiOrganize: () => void;
}

export function ComposerFullscreenDialog({
  value,
  textareaRef,
  hasInput,
  aiLoading,
  onChange,
  onClose,
  onKeyDown,
  onAiOrganize,
}: ComposerFullscreenDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm p-3 md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
        <MarkdownEditor
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="写下待办内容，支持 Markdown，或使用 AI 整理…"
          rows={18}
          textareaRef={textareaRef}
          autoFocus
          fullscreen
          onAiOrganize={onAiOrganize}
          aiLoading={aiLoading}
          aiDisabled={!hasInput}
          showFullscreenToggle
          onToggleFullscreen={onClose}
          fullscreenToggleLabel="退出全屏"
          toolbarClassName="border-b border-border/45 px-3 py-2 md:px-4"
          textareaClassName="px-4 py-4 text-sm leading-relaxed md:px-5 md:py-5 md:text-base"
        />
      </div>
    </div>
  );
}
