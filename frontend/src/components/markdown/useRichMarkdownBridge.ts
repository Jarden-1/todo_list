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
    const editor = richEditorRef.current;
    if (!editor) return;
    editor.focus();

    // execCommand needs a live caret inside the editor. If the current
    // selection is outside (or there is none), place the caret at the end so
    // toolbar actions (emoji / heading / list) actually take effect instead
    // of being silently dropped.
    const selection = window.getSelection();
    const hasCaretInEditor =
      selection &&
      selection.rangeCount > 0 &&
      editor.contains(selection.getRangeAt(0).commonAncestorContainer);

    if (!hasCaretInEditor) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
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
    // Never rewrite the DOM while the user is actively editing (typing / IME
    // composition). Rewriting innerHTML here is what makes the caret jump to
    // the start and breaks IME input in the detail panel.
    if (document.activeElement === editor || composingRef.current) return;
    if (richHtmlToMarkdown(editor) === value) {
      normalizeRichEditor(false);
      return;
    }
    renderRichFromMarkdown(value);
  }, [enabled, value]);

  useEffect(() => {
    if (!enabled || !autoFocus) return;
    requestAnimationFrame(() => richEditorRef.current?.focus());
  }, [autoFocus, enabled]);

  const handleInput = () => {
    // Only emit the markdown change here. Do NOT rewrite the editor DOM on
    // every keystroke — re-rendering innerHTML mid-typing is what caused the
    // caret to drift. Normalization happens on blur instead.
    emitRichChange();
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
