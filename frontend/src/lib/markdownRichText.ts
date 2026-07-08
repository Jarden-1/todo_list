export const RAW_MARKDOWN_PATTERN =
  /(^|\n)\s{0,3}(#{1,3}\s+\S|[-*+]\s+(?:\[[ xX]\]\s+)?\S|\d+\.\s+\S)|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|<u>[\s\S]+<\/u>|\*[^*\s][^*]*\*/;

export function escapeMarkdownLabel(label: string) {
  // Keep dots so "image.png" stays "image.png"; only neutralize characters
  // that would break markdown link/label syntax.
  return label.replace(/[\[\]()]/g, " ").replace(/\s+/g, " ").trim() || "image";
}

// Resolve an attachment URL to a form the browser can actually load. Stored
// URLs are relative like "/api/v1/files/<id>/content"; leave absolute URLs and
// data URIs untouched.
export function resolveImageSrc(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return trimmed;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  // Same-origin relative path — return as-is so it works under whatever origin
  // the app is served from.
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

export function renderInlineMarkdown(value: string) {
  const pattern =
    /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|~~([^~]+)~~|<u>([\s\S]*?)<\/u>|\*([^*]+)\*/g;
  let html = "";
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    html += escapeHtml(value.slice(lastIndex, index));

    if (match[1] !== undefined && match[2] !== undefined) {
      html += `<img src="${escapeAttribute(resolveImageSrc(match[2]))}" alt="${escapeAttribute(match[1])}" />`;
    } else if (match[3] !== undefined && match[4] !== undefined) {
      html += `<a href="${escapeAttribute(match[4])}">${renderInlineMarkdown(match[3])}</a>`;
    } else if (match[5] !== undefined) {
      html += `<code>${escapeHtml(match[5])}</code>`;
    } else if (match[6] !== undefined) {
      html += `<strong>${renderInlineMarkdown(match[6])}</strong>`;
    } else if (match[7] !== undefined) {
      html += `<s>${renderInlineMarkdown(match[7])}</s>`;
    } else if (match[8] !== undefined) {
      html += `<u>${renderInlineMarkdown(match[8])}</u>`;
    } else if (match[9] !== undefined) {
      html += `<em>${renderInlineMarkdown(match[9])}</em>`;
    }

    lastIndex = index + match[0].length;
  }

  html += escapeHtml(value.slice(lastIndex));
  return html;
}

export function markdownToRichHtml(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let listType: "ul" | "ol" | null = null;
  let taskList = false;

  const closeList = () => {
    if (!listType) return;
    html += `</${listType}>`;
    listType = null;
    taskList = false;
  };

  const openList = (type: "ul" | "ol", containsTasks = false) => {
    if (listType === type && taskList === containsTasks) return;
    closeList();
    listType = type;
    taskList = containsTasks;
    html += `<${type}${containsTasks ? ' class="contains-task-list"' : ""}>`;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      html += `<h${heading[1].length}>${renderInlineMarkdown(heading[2])}</h${heading[1].length}>`;
      continue;
    }

    const task = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (task) {
      openList("ul", true);
      html += `<li><input type="checkbox" ${task[1].toLowerCase() === "x" ? "checked " : ""}class="task-checkbox" /> ${renderInlineMarkdown(task[2])}</li>`;
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    if (unordered) {
      openList("ul");
      html += `<li>${renderInlineMarkdown(unordered[1])}</li>`;
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      openList("ol");
      html += `<li>${renderInlineMarkdown(ordered[1])}</li>`;
      continue;
    }

    closeList();
    html += `<p>${renderInlineMarkdown(line)}</p>`;
  }

  closeList();
  return html;
}

function nodeChildrenToMarkdown(element: Element) {
  return Array.from(element.childNodes).map((node) => nodeToMarkdown(node)).join("");
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.replace(/\u00a0/g, " ") ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === "br") return "\n";
  if (tag === "img") {
    const image = element as HTMLImageElement;
    // Prefer the original attribute (may be relative) over the resolved
    // absolute `.src`, so the markdown stays stable across round-trips and
    // does not bake in the current origin.
    const src = image.getAttribute("src") || image.src || "";
    return `![${escapeMarkdownLabel(image.alt || "image")}](${src})`;
  }
  if (tag === "a") {
    const href = (element as HTMLAnchorElement).href || element.getAttribute("href") || "https://";
    const label = nodeChildrenToMarkdown(element).trim() || href;
    return `[${label}](${href})`;
  }
  if (tag === "strong" || tag === "b") return `**${nodeChildrenToMarkdown(element)}**`;
  if (tag === "em" || tag === "i") return `*${nodeChildrenToMarkdown(element)}*`;
  if (tag === "u") return `<u>${nodeChildrenToMarkdown(element)}</u>`;
  if (tag === "s" || tag === "strike" || tag === "del") return `~~${nodeChildrenToMarkdown(element)}~~`;
  if (tag === "code") return `\`${element.textContent ?? ""}\``;
  if (tag === "pre") return `\`\`\`\n${element.textContent?.trimEnd() ?? ""}\n\`\`\``;
  if (/^h[1-6]$/.test(tag)) {
    const level = Math.min(Number(tag.slice(1)), 3);
    return `${"#".repeat(level)} ${nodeChildrenToMarkdown(element).trim()}`;
  }
  if (tag === "ul" || tag === "ol") {
    const items = Array.from(element.children).filter((child) => child.tagName.toLowerCase() === "li");
    return items
      .map((item, index) => {
        const checkbox = item.querySelector(":scope > input[type='checkbox']") as HTMLInputElement | null;
        const marker =
          tag === "ol" ? `${index + 1}. ` : checkbox ? `- [${checkbox.checked ? "x" : " "}] ` : "- ";
        const content = Array.from(item.childNodes)
          .filter((child) => child !== checkbox)
          .map((child) => nodeToMarkdown(child))
          .join("")
          .trim();
        return `${marker}${content}`;
      })
      .join("\n");
  }
  if (tag === "li") return nodeChildrenToMarkdown(element).trim();
  if (tag === "input") return "";
  if (tag === "p" || tag === "div") return nodeChildrenToMarkdown(element).trim();

  return nodeChildrenToMarkdown(element);
}

export function richHtmlToMarkdown(root: HTMLElement) {
  return Array.from(root.childNodes)
    .map((node) => nodeToMarkdown(node).trimEnd())
    .filter((block) => block.trim().length > 0)
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getTextNodeMarkdownSyntax(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const parent = node.parentElement;
    const parentTag = parent?.tagName.toLowerCase();
    if (parentTag !== "code" && parentTag !== "pre" && RAW_MARKDOWN_PATTERN.test(node.textContent ?? "")) {
      return true;
    }
    node = walker.nextNode();
  }

  return false;
}

export function getCaretOffset(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.endContainer)) return null;

  const beforeCaret = range.cloneRange();
  beforeCaret.selectNodeContents(root);
  beforeCaret.setEnd(range.endContainer, range.endOffset);
  return beforeCaret.toString().length;
}

export function restoreCaretOffset(root: HTMLElement, offset: number | null) {
  if (offset === null) return;

  const selection = window.getSelection();
  if (!selection) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  let targetNode: Node | null = null;
  let targetOffset = 0;

  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      targetNode = node;
      targetOffset = remaining;
      break;
    }
    remaining -= length;
    node = walker.nextNode();
  }

  if (!targetNode) {
    targetNode = root;
    targetOffset = root.childNodes.length;
  }

  const range = document.createRange();
  range.setStart(targetNode, targetOffset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}
