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
  // Remember the last caret/selection inside the editor so toolbar buttons
  // (which steal focus via mousedown) can restore it before running a command.
  const savedRangeRef = useRef<Range | null>(null);

  const rememberSelection = () => {
    const editor = richEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

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

  // Focus the editor and guarantee there is a usable caret inside it. Toolbar
  // buttons fire on mousedown (so the editor never truly loses focus), but on
  // an empty editor there may be no Range at all — execCommand then silently
  // no-ops. We restore the remembered selection, or place the caret at the end.
  const focusRichEditor = () => {
    const editor = richEditorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection) return;

    const caretInEditor =
      selection.rangeCount > 0 &&
      editor.contains(selection.getRangeAt(0).commonAncestorContainer);

    if (caretInEditor) return;

    // Try to restore a previously saved selection.
    if (savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
      return;
    }

    // Fall back to the end of the editor content.
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const runRichCommand = (command: string, commandValue?: string) => {
    focusRichEditor();
    document.execCommand(command, false, commandValue);
    emitRichChange();
    rememberSelection();
  };

  const insertRichHtml = (html: string) => {
    focusRichEditor();
    let inserted = false;
    try {
      inserted = document.execCommand("insertHTML", false, html);
    } catch {
      inserted = false;
    }
    // execCommand("insertHTML") can fail on an empty contentEditable in some
    // browsers — fall back to manual Range insertion so the action always works.
    if (!inserted) {
      const selection = window.getSelection();
      const editor = richEditorRef.current;
      if (selection && selection.rangeCount > 0 && editor) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const template = document.createElement("template");
        template.innerHTML = html;
        const fragment = template.content;
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
    emitRichChange();
    rememberSelection();
  };

  const insertRichText = (text: string) => {
    focusRichEditor();
    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, text);
    } catch {
      inserted = false;
    }
    if (!inserted) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    emitRichChange();
    rememberSelection();
  };

  const setEmptyRichBlock = (tagName: "p" | "h1" | "h2" | "h3") => {
    const editor = richEditorRef.current;
    if (!editor) return;

    const block = document.createElement(tagName);
    const br = document.createElement("br");
    block.appendChild(br);
    editor.replaceChildren(block);
    editor.focus();

    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.setStart(block, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }

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

  // After deleting all text/images the browser often leaves a stray empty
  // block (e.g. <p><br></p> or <h1><br></h1>). That residual block occupies a
  // line and pushes the caret below the placeholder. If the editor is visually
  // empty, clear it fully so the placeholder and caret line up at the top.
  const clearIfEmpty = () => {
    const editor = richEditorRef.current;
    if (!editor) return false;
    if (composingRef.current) return false;
    if ((editor.textContent ?? "").trim() !== "") return false;
    if (editor.querySelector("img")) return false; // keep real media content
    if (editor.childNodes.length === 0) return false;

    editor.innerHTML = "";
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }
    return true;
  };

  const handleInput = () => {
    // Only emit the markdown change here. Do NOT rewrite the editor DOM on
    // every keystroke — re-rendering innerHTML mid-typing is what caused the
    // caret to drift. Normalization happens on blur instead.
    clearIfEmpty();
    emitRichChange();
    rememberSelection();
  };

  const handleSelectionSnapshot = () => {
    rememberSelection();
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
    setEmptyRichBlock,
    handleInput,
    handleBlur,
    handleCompositionStart,
    handleCompositionEnd,
    handleSelectionSnapshot,
  };
}
