import {
  useEffect,
  useRef,
  type CompositionEvent,
} from "react";
import {
  getCaretOffset,
  getTextNodeMarkdownSyntax,
  markdownToRichHtml,
  restoreCaretOffset,
  richHtmlToMarkdown,
} from "../../lib/markdownRichText";

interface UseRichMarkdownBridgeOptions {
  value: string;
  onChange: (value: string) => void;
  enabled: boolean;
  autoFocus?: boolean;
}

export function useRichMarkdownBridge({
  value,
  onChange,
  enabled,
  autoFocus,
}: UseRichMarkdownBridgeOptions) {
  const richEditorRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);

  const emitRichChange = () => {
    const editor = richEditorRef.current;
    if (!editor) return;
    onChange(richHtmlToMarkdown(editor));
  };

  const renderRichFromMarkdown = (markdown: string, preserveCaret = false) => {
    const editor = richEditorRef.current;
    if (!editor) return;

    const caretOffset = preserveCaret ? getCaretOffset(editor) : null;
    editor.innerHTML = markdown ? markdownToRichHtml(markdown) : "";

    if (preserveCaret && document.activeElement === editor) {
      restoreCaretOffset(editor, caretOffset);
    }
  };

  const normalizeRichEditor = (preserveCaret = false) => {
    const editor = richEditorRef.current;
    if (!editor || !getTextNodeMarkdownSyntax(editor)) return;
    renderRichFromMarkdown(richHtmlToMarkdown(editor), preserveCaret);
  };

  const focusRichEditor = () => {
    richEditorRef.current?.focus();
  };

  const runRichCommand = (command: string, commandValue?: string) => {
    focusRichEditor();
    document.execCommand(command, false, commandValue);
    emitRichChange();
  };

  const insertRichHtml = (html: string) => {
    focusRichEditor();
    document.execCommand("insertHTML", false, html);
    emitRichChange();
  };

  const insertRichText = (text: string) => {
    focusRichEditor();
    document.execCommand("insertText", false, text);
    emitRichChange();
  };

  useEffect(() => {
    if (!enabled) return;
    const editor = richEditorRef.current;
    if (!editor) return;
    if (richHtmlToMarkdown(editor) === value) {
      if (document.activeElement !== editor) normalizeRichEditor(false);
      return;
    }
    renderRichFromMarkdown(value);
  }, [enabled, value]);

  useEffect(() => {
    if (!enabled || !autoFocus) return;
    requestAnimationFrame(() => richEditorRef.current?.focus());
  }, [autoFocus, enabled]);

  const handleInput = () => {
    emitRichChange();
    if (!composingRef.current) {
      requestAnimationFrame(() => normalizeRichEditor(true));
    }
  };

  const handleBlur = () => {
    emitRichChange();
    normalizeRichEditor(false);
  };

  const handleCompositionStart = (_event: CompositionEvent<HTMLDivElement>) => {
    composingRef.current = true;
  };

  const handleCompositionEnd = () => {
    composingRef.current = false;
    handleInput();
  };

  return {
    richEditorRef,
    runRichCommand,
    insertRichHtml,
    insertRichText,
    handleInput,
    handleBlur,
    handleCompositionStart,
    handleCompositionEnd,
  };
}
