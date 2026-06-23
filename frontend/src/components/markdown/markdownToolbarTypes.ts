import type { Dispatch, SetStateAction } from "react";

export type InlineCommand = "bold" | "italic" | "underline" | "strikeThrough";
export type HeadingLevel = 0 | 1 | 2 | 3;
export type MarkdownToolbarMode = "full" | "minimal" | "responsive" | "hidden";

export interface MarkdownToolbarProps {
  mode: MarkdownToolbarMode;
  fullscreen: boolean;
  toolbarClassName?: string;
  emojiOpen: boolean;
  setEmojiOpen: Dispatch<SetStateAction<boolean>>;
  headingOpen: boolean;
  setHeadingOpen: Dispatch<SetStateAction<boolean>>;
  insertText: (text: string) => void;
  applyInline: (command: InlineCommand, markdownPrefix: string, markdownSuffix?: string) => void;
  applyHeading: (level: HeadingLevel) => void;
  applyList: (ordered: boolean) => void;
  applyTaskList: () => void;
  insertLink: () => void;
  openImagePicker: () => void;
  sourceMode?: boolean;
  onToggleSourceMode?: () => void;
  onAiOrganize?: () => void;
  aiLoading?: boolean;
  aiDisabled?: boolean;
  aiLabel: string;
  showFullscreenToggle?: boolean;
  onToggleFullscreen?: () => void;
  fullscreenToggleLabel?: string;
}
