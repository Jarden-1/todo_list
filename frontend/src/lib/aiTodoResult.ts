import type { AiOrganizeResult } from "./types";
import { extractEmbeddedImageMarkdown } from "./markdownImages";

export function appendEmbeddedImagesToAiResult(
  result: AiOrganizeResult,
  originalInput: string
): AiOrganizeResult {
  const images = extractEmbeddedImageMarkdown(originalInput);
  if (!images.length) return result;

  const currentContent = result.contentMarkdown ?? "";
  const missingImages = images.filter((image) => !currentContent.includes(image));
  if (!missingImages.length) return result;

  return {
    ...result,
    contentMarkdown: [
      currentContent.trim(),
      "## 图片",
      missingImages.join("\n\n"),
    ].filter(Boolean).join("\n\n"),
  };
}
