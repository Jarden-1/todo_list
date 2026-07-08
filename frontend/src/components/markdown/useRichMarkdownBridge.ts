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
  // Track the last markdown value emitted by the editor itself. When value
  // changes originate from the editor (typing, toolbar, etc.) the DOM is
  // already in sync and must NOT be rewritten — rewriting innerHTML is what
  // causes the caret to jump. Only external value changes (undo, programmatic
  // set) should trigger a full re-render.
  const lastEmittedValueRef = useRef<string>("");

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
    const markdown = richHtmlToMarkdown(editor);
    lastEmittedValueRef.current = markdown;
    onChange(markdown);
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
        box.className = "task-checkbox";
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
    // If the value change originated from the editor itself (emitRichChange),
    // the DOM is already in sync — only normalize, never full-rewrite.
    if (value === lastEmittedValueRef.current) {
      normalizeRichEditor(false);
      return;
    }
    // External value change (undo, programmatic set) — full re-render.
    lastEmittedValueRef.current = value;
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

  // Click handler for task-list checkboxes. Toggles the checked state and
  // emits the change so the markdown source ([ ] ↔ [x]) stays in sync.
  const handleRichClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName !== "INPUT" || target.getAttribute("type") !== "checkbox") return;
    event.preventDefault();
    const checkbox = target as HTMLInputElement;
    checkbox.checked = !checkbox.checked;
    emitRichChange();
  };

  // Handle Enter inside a task-list <li>. Browsers create a plain <li> without
  // a checkbox, which breaks the task list into a half-task half-list mess.
  // Instead: if the current task line is empty, exit the list; otherwise insert
  // a new <li> with a fresh unchecked checkbox and place the caret after it.
  const handleTaskListEnter = (event: React.KeyboardEvent<HTMLDivElement>): boolean => {
    const editor = richEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;
    while (node && node !== editor && node.nodeName !== "LI") {
      node = node.parentNode;
    }
    const li = node as HTMLLIElement | null;
    if (!li || li.nodeName !== "LI") return false;
    const list = li.parentElement;
    if (!list || !list.classList.contains("contains-task-list")) return false;

    event.preventDefault();

    // Detect empty task line: only the checkbox + a single whitespace text
    // node (or <br>), no real text. In that case the user wants to exit the
    // task list — insert a paragraph after the list and move the caret there.
    const liText = (li.textContent ?? "").replace(/\u200B/g, "").trim();
    if (!liText) {
      const paragraph = document.createElement("p");
      paragraph.appendChild(document.createElement("br"));
      list.after(paragraph);
      li.remove();
      const caret = document.createRange();
      caret.setStart(paragraph, 0);
      caret.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caret);
      savedRangeRef.current = caret.cloneRange();
      emitRichChange();
      return true;
    }

    // Non-empty line: create a new task <li> with an unchecked checkbox.
    const newLi = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    newLi.appendChild(checkbox);
    newLi.appendChild(document.createTextNode(" "));
    li.after(newLi);

    // Place the caret right after the space, so typing begins as task text.
    const caret = document.createRange();
    caret.setStart(newLi, newLi.childNodes.length);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
    savedRangeRef.current = caret.cloneRange();
    emitRichChange();
    return true;
  };

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
    handleRichClick,
    handleTaskListEnter,
  };
}
