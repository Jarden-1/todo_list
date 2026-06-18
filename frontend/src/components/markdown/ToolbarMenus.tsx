import { ChevronDown, Heading, Smile } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { cn } from "../../lib/utils";
import { ToolbarButton } from "./ToolbarButton";
import type { HeadingLevel, MarkdownToolbarProps } from "./markdownToolbarTypes";

const EMOJIS = ["😊", "👍", "🔥", "⭐", "✅", "⚠️", "💡", "🎯", "🙏", "🚀", "📌", "📝"];

const HEADING_OPTIONS = [
  { label: "正文", level: 0 as const },
  { label: "标题 1", level: 1 as const },
  { label: "标题 2", level: 2 as const },
  { label: "标题 3", level: 3 as const },
];

function EmojiPicker({
  open,
  insertText,
  setOpen,
}: {
  open: boolean;
  insertText: (text: string) => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  if (!open) return null;

  return (
    <div className="absolute left-0 top-full z-[90] mt-2 grid w-52 grid-cols-6 gap-1 rounded-xl border border-border/70 bg-popover p-2 shadow-xl">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            insertText(emoji);
            setOpen(false);
          }}
          className="flex h-7 items-center justify-center rounded-lg text-sm hover:bg-muted"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function HeadingMenu({
  open,
  applyHeading,
}: {
  open: boolean;
  applyHeading: (level: HeadingLevel) => void;
}) {
  if (!open) return null;

  return (
    <div className="absolute left-0 top-full z-[90] mt-2 w-32 overflow-hidden rounded-xl border border-border/70 bg-popover p-1 text-xs shadow-xl">
      {HEADING_OPTIONS.map((option) => (
        <button
          key={option.label}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyHeading(option.level)}
          className="block w-full rounded-lg px-2 py-1.5 text-left text-foreground hover:bg-muted"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EmojiToolbarItem({
  emojiOpen,
  setEmojiOpen,
  setHeadingOpen,
  insertText,
  className,
}: Pick<MarkdownToolbarProps, "emojiOpen" | "setEmojiOpen" | "setHeadingOpen" | "insertText"> & {
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <ToolbarButton
        icon={Smile}
        aria-label="插入表情"
        title="插入表情"
        active={emojiOpen}
        onClick={() => {
          setEmojiOpen((open) => !open);
          setHeadingOpen(false);
        }}
      />
      <EmojiPicker open={emojiOpen} insertText={insertText} setOpen={setEmojiOpen} />
    </div>
  );
}

export function HeadingToolbarItem({
  headingOpen,
  setHeadingOpen,
  setEmojiOpen,
  applyHeading,
  className,
}: Pick<MarkdownToolbarProps, "headingOpen" | "setHeadingOpen" | "setEmojiOpen" | "applyHeading"> & {
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label="标题样式"
        title="标题样式 Cmd/Ctrl+Alt+1/2/3"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setHeadingOpen((open) => !open);
          setEmojiOpen(false);
        }}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-0.5 rounded-lg px-2 text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          headingOpen && "bg-primary/10 text-primary"
        )}
      >
        <Heading className="h-4 w-4" />
        <ChevronDown className="h-3 w-3" />
      </button>
      <HeadingMenu open={headingOpen} applyHeading={applyHeading} />
    </div>
  );
}
