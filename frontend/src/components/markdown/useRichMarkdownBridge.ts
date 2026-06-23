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

  // Insert a list via direct DOM manipulation so it works reliably even on a
  // completely empty editor (where execCommand("insertUnorderedList") silently
  // no-ops in Chromium). `items` are plain-text lines; an empty array yields a
  // single empty <li> with the caret placed inside it ready for typing.
  const insertRichList = (ordered: boolean, items: string[], task = false) => {
    const editor = richEditorRef.current;
    if (!editor) return;
    focusRichEditor();

    const listTag = ordered ? "ol" : "ul";
    const list = document.createElement(listTag);
    if (task) list.className = "contains-task-list";

    const lines = items.length > 0 ? items : [""];
    const liNodes: HTMLLIElement[] = lines.map((line) => {
      const li = document.createElement("li");
      if (task) {
        const box = document.createElement("input");
        box.type = "checkbox";
        box.disabled = true;
        li.appendChild(box);
        li.appendChild(document.createTextNode(" "));
      }
      if (line) li.appendChild(document.createTextNode(line));
      else li.appendChild(document.createElement("br"));
      return li;
    });
    liNodes.forEach((li) => list.appendChild(li));

    // Replace the current selection (if inside the editor) with the list,
    // otherwise append to the end.
    const selection = window.getSelection();
    const range =
      selection &&
      selection.rangeCount > 0 &&
      editor.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.getRangeAt(0)
        : (() => {
            const r = document.createRange();
            r.selectNodeContents(editor);
            r.collapse(false);
            return r;
          })();

    range.deleteContents();
    range.insertNode(list);

    // Place the caret inside the first <li> (after the checkbox/space for task
    // lists) so the user can type immediately.
    if (selection) {
      const firstLi = liNodes[0];
      const caret = document.createRange();
      caret.selectNodeContents(firstLi);
      caret.collapse(false);
      selection.removeAllRanges();
      selection.addRange(caret);
      savedRangeRef.current = caret.cloneRange();
    }

    emitRichChange();
    rememberSelection();
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
    // Intentionally only depends on [enabled, value]; the helper functions are
    // stable for this hook instance and re-running on their identity would
    // cause unnecessary DOM rewrites.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, value]);

  useEffect(() => {
    if (!enabled || !autoFocus) return;
    // The composer swaps a plain <textarea> (collapsed) for this rich editor
    // (expanded) on click, so focus is lost across the unmount/mount. Re-focus
    // here AND place a visible caret inside the editor — focusing an empty
    // contentEditable alone sometimes leaves no caret, which is exactly the
    // "expanded but no cursor" bug. Run after paint so the node is mounted.
    requestAnimationFrame(() => {
      const editor = richEditorRef.current;
      if (!editor) return;
      editor.focus();

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
      rememberSelection();
    });
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

  // On focus, drop any stray empty block so the caret starts on the first line
  // (aligned with the placeholder) instead of being pushed below it.
  const handleFocus = () => {
    clearIfEmpty();
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

  // Snapshot of the current editor innerHTML — used to detect whether a native
  // execCommand actually changed anything (e.g. insertOrderedList no-ops on an
  // empty editor).
  const getRichHtml = () => richEditorRef.current?.innerHTML ?? "";

  return {
    richEditorRef,
    runRichCommand,
    insertRichHtml,
    insertRichText,
    setEmptyRichBlock,
    insertRichList,
    getRichHtml,
    normalizeRichEditor,
    handleInput,
    handleBlur,
    handleFocus,
    handleCompositionStart,
    handleCompositionEnd,
    handleSelectionSnapshot,
  };
}
