const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/gi;
const EXISTING_IMAGE_PLACEHOLDER_PATTERN = /\[\[IMAGE_\d+:[^\]]+\]\]/gi;
const PROTECTED_IMAGE_TOKEN_PATTERN = /\[\[SMARTTODO_IMAGE_(\d+)\]\]/g;

interface ImagePlaceholder {
  token: string;
  original: string;
}

function getImageMatches(markdown: string): Array<{
  index: number;
  length: number;
  snippet: string;
}> {
  const matches: Array<{ index: number; length: number; snippet: string }> = [];

  for (const match of markdown.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    if (match.index === undefined) continue;
    matches.push({
      index: match.index,
      length: match[0].length,
      snippet: match[0]
    });
  }

  for (const match of markdown.matchAll(EXISTING_IMAGE_PLACEHOLDER_PATTERN)) {
    if (match.index === undefined) continue;
    matches.push({
      index: match.index,
      length: match[0].length,
      snippet: match[0]
    });
  }

  return matches.sort((a, b) => a.index - b.index);
}

export function replaceImagesWithPlaceholders(markdown: string): {
  markdownWithPlaceholders: string;
  placeholders: ImagePlaceholder[];
} {
  const matches = getImageMatches(markdown);

  if (matches.length === 0) {
    return {
      markdownWithPlaceholders: markdown,
      placeholders: []
    };
  }

  const placeholders: ImagePlaceholder[] = [];
  let cursor = 0;
  let markdownWithPlaceholders = "";

  matches.forEach((match) => {
    if (match.index < cursor) {
      return;
    }

    const token = `[[SMARTTODO_IMAGE_${placeholders.length + 1}]]`;
    placeholders.push({
      token,
      original: match.snippet
    });

    markdownWithPlaceholders += markdown.slice(cursor, match.index);
    markdownWithPlaceholders += token;
    cursor = match.index + match.length;
  });

  markdownWithPlaceholders += markdown.slice(cursor);

  return {
    markdownWithPlaceholders,
    placeholders
  };
}

export function restoreImagePlaceholders(
  markdown: string,
  placeholders: ImagePlaceholder[]
): string {
  const restoredOrder = extractRestoredImageOrder(markdown);
  const reordered =
    restoredOrder.length === placeholders.length &&
    restoredOrder.some((value, index) => value !== index + 1);

  if (reordered) {
    const markdownWithoutTokens = markdown
      .replace(PROTECTED_IMAGE_TOKEN_PATTERN, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const images = placeholders.map((placeholder) => placeholder.original);

    return [markdownWithoutTokens, "## 图片", images.join("\n\n")]
      .filter(Boolean)
      .join("\n\n");
  }

  let restored = markdown;

  placeholders.forEach((placeholder) => {
    restored = restored.split(placeholder.token).join(placeholder.original);
  });

  const missingImages = placeholders
    .filter((placeholder) => !restored.includes(placeholder.original))
    .map((placeholder) => placeholder.original);

  if (missingImages.length === 0) {
    return restored;
  }

  return [restored.trim(), "## 图片", missingImages.join("\n\n")]
    .filter(Boolean)
    .join("\n\n");
}

export function extractRestoredImageOrder(markdown: string): number[] {
  return Array.from(markdown.matchAll(PROTECTED_IMAGE_TOKEN_PATTERN))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value > 0);
}
