import {
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { toast } from "sonner";
import { uploadFile } from "../../lib/filesApi";
import {
  RAW_MARKDOWN_PATTERN,
  escapeAttribute,
  escapeHtml,
  escapeMarkdownLabel,
  markdownToRichHtml,
  resolveImageSrc,
} from "../../lib/markdownRichText";
import { useRichMarkdownBridge } from "./useRichMarkdownBridge";

type InlineCommand = "bold" | "italic" | "underline" | "strikeThrough";
type HeadingLevel = 0 | 1 | 2 | 3;

interface UseMarkdownEditorControllerOptions {
  value: string;
  onChange: (value: string) => void;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  richEditor: boolean;
  autoFocus?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => void;
  todoId?: string;
}

export function useMarkdownEditorController({
  value,
  onChange,
  editorRef,
  richEditor,
  autoFocus,
  onKeyDown,
  todoId,
}: UseMarkdownEditorControllerOptions) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [headingOpen, setHeadingOpen] = useState(false);
  const richBridge = useRichMarkdownBridge({
    value,
    onChange,
    enabled: richEditor,
    autoFocus,
  });

  const commitValue = (nextValue: string, selectionStart: number, selectionEnd = selectionStart) => {
    onChange(nextValue);
    requestAnimationFrame(() => {
      const textarea = editorRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const getSelection = () => {
    const textarea = editorRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    return { start, end, selected: value.slice(start, end) };
  };

  const insertText = (text: string, cursorStart = text.length, cursorEnd = cursorStart) => {
    if (richEditor) {
      richBridge.insertRichText(text);
      return;
    }

    const { start, end } = getSelection();
    const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
    commitValue(nextValue, start + cursorStart, start + cursorEnd);
  };

  const wrapSelection = (prefix: string, suffix = prefix, fallback = "文本") => {
    const { start, end, selected } = getSelection();
    const content = selected || fallback;
    const inserted = `${prefix}${content}${suffix}`;
    const nextValue = `${value.slice(0, start)}${inserted}${value.slice(end)}`;
    commitValue(nextValue, start + prefix.length, start + prefix.length + content.length);
  };

  const applyInline = (
    command: InlineCommand,
    markdownPrefix: string,
    markdownSuffix = markdownPrefix
  ) => {
    if (richEditor) {
      richBridge.runRichCommand(command);
      return;
    }
    wrapSelection(markdownPrefix, markdownSuffix);
  };

  const transformSelectedLines = (transform: (line: string, index: number) => string) => {
    const { start, end } = getSelection();
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextLineBreak = value.indexOf("\n", end);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const block = value.slice(lineStart, lineEnd) || "";
    const transformed = block.split("\n").map(transform).join("\n");
    const nextValue = `${value.slice(0, lineStart)}${transformed}${value.slice(lineEnd)}`;
    commitValue(nextValue, lineStart, lineStart + transformed.length);
  };

  const applyHeading = (level: HeadingLevel) => {
    if (richEditor) {
      const editor = richBridge.richEditorRef.current;
      const isEmpty = !editor || editor.textContent?.trim() === "";
      if (isEmpty) {
        // formatBlock is unreliable on an empty contentEditable. Create an
        // empty heading/paragraph block and put the caret inside it; do not
        // insert visible placeholder words.
        const tagByLevel: Record<HeadingLevel, "p" | "h1" | "h2" | "h3"> = {
          0: "p",
          1: "h1",
          2: "h2",
          3: "h3",
        };
        richBridge.setEmptyRichBlock(tagByLevel[level]);
      } else {
        richBridge.runRichCommand("formatBlock", level === 0 ? "p" : `h${level}`);
      }
      setHeadingOpen(false);
      return;
    }

    const prefix = level === 0 ? "" : `${"#".repeat(level)} `;
    transformSelectedLines((line) => {
      const stripped = line.replace(/^\s{0,3}#{1,6}\s+/, "");
      if (!stripped.trim()) return prefix ? `${prefix}标题` : "";
      return `${prefix}${stripped}`;
    });
    setHeadingOpen(false);
  };

  const applyList = (ordered: boolean) => {
    if (richEditor) {
      // Prefer the browser's native list command so the caret lands inside an
      // empty <li> ready for typing. Only fall back to building HTML from a
      // multi-line selection. Never inject placeholder text like "列表项".
      const selectedText = window.getSelection()?.toString() ?? "";
      if (!selectedText.includes("\n")) {
        richBridge.runRichCommand(ordered ? "insertOrderedList" : "insertUnorderedList");
        return;
      }
      const items = selectedText
        .split(/\n+/)
        .map((item) => `<li>${escapeHtml(item.trim())}</li>`);
      const tag = ordered ? "ol" : "ul";
      richBridge.insertRichHtml(`<${tag}>${items.join("")}</${tag}>`);
      return;
    }

    transformSelectedLines((line, index) => {
      const stripped = line.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, "");
      const marker = ordered ? `${index + 1}. ` : "- ";
      return `${marker}${stripped}`;
    });
  };

  const applyTaskList = () => {
    if (richEditor) {
      const selectedText = window.getSelection()?.toString().trim();
      // Empty item when no selection, so the user can type into it directly.
      const items = (selectedText ? selectedText.split(/\n+/) : [""]).map((item) =>
        `<li><input type="checkbox" disabled /> ${escapeHtml(item.trim())}</li>`
      );
      richBridge.insertRichHtml(`<ul class="contains-task-list">${items.join("")}</ul>`);
      return;
    }

    transformSelectedLines((line) => {
      const stripped = line.replace(/^\s*(?:[-*+]\s+(?:\[[ xX]\]\s+)?|\d+\.\s+)/, "");
      return `- [ ] ${stripped}`;
    });
  };

  const insertLink = () => {
    if (richEditor) {
      const selection = window.getSelection();
      const selectedText = selection?.toString();
      if (selectedText) {
        richBridge.runRichCommand("createLink", "https://");
      } else {
        richBridge.insertRichHtml(`<a href="https://">链接文字</a>`);
      }
      return;
    }

    const { start, end, selected } = getSelection();
    const label = selected || "链接文字";
    const inserted = `[${label}](https://)`;
    const nextValue = `${value.slice(0, start)}${inserted}${value.slice(end)}`;
    const urlStart = start + label.length + 3;
    commitValue(nextValue, urlStart, urlStart + 8);
  };

  const insertImageFiles = async (files: File[]) => {
    if (!files.length) return;

    try {
      const images = await Promise.all(
        files.map(async (file) => {
          const { file: uploaded } = await uploadFile(file, { todoId, type: "image" });
          // Store the (relative) content URL as returned by the backend. It is
          // same-origin so it loads under any host; resolveImageSrc normalizes
          // it consistently both on insert and after the markdown round-trip.
          const rawUrl = uploaded.url || `/api/v1/files/${uploaded.id}/content`;
          return {
            label: escapeMarkdownLabel(file.name),
            url: resolveImageSrc(rawUrl),
          };
        })
      );

      if (richEditor) {
        richBridge.insertRichHtml(
          images
            .map((image) => `<p><img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.label)}" /></p>`)
            .join("")
        );
      } else {
        const block = `\n${images.map((image) => `![${image.label}](${image.url})`).join("\n\n")}\n`;
        insertText(block);
      }

      toast.success(files.length > 1 ? `已插入 ${files.length} 张图片` : "已插入图片");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "图片插入失败");
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    const imageFiles = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (imageFiles.length) {
      event.preventDefault();
      void insertImageFiles(imageFiles);
      return;
    }

    if (richEditor) {
      const plainText = event.clipboardData.getData("text/plain");
      if (!plainText) return;
      event.preventDefault();
      if (RAW_MARKDOWN_PATTERN.test(plainText)) {
        richBridge.insertRichHtml(markdownToRichHtml(plainText));
      } else {
        richBridge.insertRichText(plainText);
      }
    }
  };

  const handlePlainKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        applyInline("bold", "**", "**");
        return;
      }
      if (key === "i") {
        event.preventDefault();
        applyInline("italic", "*", "*");
        return;
      }
      if (key === "u") {
        event.preventDefault();
        applyInline("underline", "<u>", "</u>");
        return;
      }
      if (key === "k") {
        event.preventDefault();
        insertLink();
        return;
      }
      if (event.shiftKey && (key === "7" || event.code === "Digit7")) {
        event.preventDefault();
        applyList(true);
        return;
      }
      if (event.shiftKey && (key === "8" || event.code === "Digit8")) {
        event.preventDefault();
        applyList(false);
        return;
      }
      if (event.shiftKey && (key === "9" || event.code === "Digit9")) {
        event.preventDefault();
        applyTaskList();
        return;
      }
    }

    onKeyDown?.(event);
  };

  const handleRichKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        richBridge.runRichCommand("bold");
        return;
      }
      if (key === "i") {
        event.preventDefault();
        richBridge.runRichCommand("italic");
        return;
      }
      if (key === "u") {
        event.preventDefault();
        richBridge.runRichCommand("underline");
        return;
      }
      if (key === "k") {
        event.preventDefault();
        insertLink();
        return;
      }
      if (event.shiftKey && key === "x") {
        event.preventDefault();
        richBridge.runRichCommand("strikeThrough");
        return;
      }
      if (event.shiftKey && (key === "7" || event.code === "Digit7")) {
        event.preventDefault();
        applyList(true);
        return;
      }
      if (event.shiftKey && (key === "8" || event.code === "Digit8")) {
        event.preventDefault();
        applyList(false);
        return;
      }
      if (event.shiftKey && (key === "9" || event.code === "Digit9")) {
        event.preventDefault();
        applyTaskList();
        return;
      }
    }

    if ((event.metaKey || event.ctrlKey) && event.altKey) {
      const key = event.key;
      if (key === "0" || key === "1" || key === "2" || key === "3") {
        event.preventDefault();
        applyHeading(Number(key) as HeadingLevel);
        return;
      }
    }

    onKeyDown?.(event);
  };

  const handleRichBeforeInput = (event: FormEvent<HTMLDivElement>) => {
    const inputEvent = event.nativeEvent as InputEvent;
    if (inputEvent.inputType === "insertOrderedList") {
      event.preventDefault();
      applyList(true);
      return;
    }

    if (inputEvent.inputType === "insertUnorderedList") {
      event.preventDefault();
      applyList(false);
      return;
    }

    const commandByInputType: Record<string, string> = {
      formatBold: "bold",
      formatItalic: "italic",
      formatUnderline: "underline",
      formatStrikeThrough: "strikeThrough",
    };
    const command = commandByInputType[inputEvent.inputType];

    if (!command) return;

    event.preventDefault();
    richBridge.runRichCommand(command);
  };

  return {
    richEditorRef: richBridge.richEditorRef,
    imageInputRef,
    emojiOpen,
    setEmojiOpen,
    headingOpen,
    setHeadingOpen,
    insertText,
    applyInline,
    applyHeading,
    applyList,
    applyTaskList,
    insertLink,
    insertImageFiles,
    handlePaste,
    handleRichInput: richBridge.handleInput,
    handleRichBlur: richBridge.handleBlur,
    handleRichFocus: richBridge.handleFocus,
    handleCompositionStart: richBridge.handleCompositionStart,
    handleCompositionEnd: richBridge.handleCompositionEnd,
    handleRichSelectionSnapshot: richBridge.handleSelectionSnapshot,
    handlePlainKeyDown,
    handleRichKeyDown,
    handleRichBeforeInput,
  };
}
