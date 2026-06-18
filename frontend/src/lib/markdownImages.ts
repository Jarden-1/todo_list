export const EMBEDDED_MARKDOWN_IMAGE_PATTERN =
  /!\[([^\]]*)\]\((data:image\/(?:png|jpe?g|webp|gif);base64,[^)]+)\)/gi;

export const IMAGE_MAX_BYTES = 6 * 1024 * 1024;
export const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:png|jpe?g|webp|gif);base64,/i;

export function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!IMAGE_DATA_URL_PATTERN.test(`data:${file.type};base64,`)) {
      reject(new Error("只支持 PNG、JPG、WebP、GIF 图片"));
      return;
    }

    if (file.size > IMAGE_MAX_BYTES) {
      reject(new Error("图片太大，请选择 6MB 以内的图片"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("图片读取失败"));
      }
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export function extractEmbeddedImageMarkdown(markdown: string) {
  const seen = new Set<string>();
  const images: string[] = [];

  for (const match of markdown.matchAll(EMBEDDED_MARKDOWN_IMAGE_PATTERN)) {
    const snippet = match[0];
    if (seen.has(snippet)) continue;
    seen.add(snippet);
    images.push(snippet);
  }

  return images;
}

export function stripEmbeddedImagesForAi(markdown: string) {
  return markdown.replace(EMBEDDED_MARKDOWN_IMAGE_PATTERN, (_, label: string) => {
    const imageLabel = label?.trim() || "图片";
    return `[已插入图片：${imageLabel}]`;
  });
}

export function replaceEmbeddedImagesWithPlaceholders(markdown: string) {
  const images: string[] = [];
  const markdownWithPlaceholders = markdown.replace(
    EMBEDDED_MARKDOWN_IMAGE_PATTERN,
    (snippet: string, label: string) => {
      const index = images.length;
      images.push(snippet);
      const imageLabel = label?.trim() || "图片";
      return `[[IMAGE_${index + 1}: ${imageLabel}]]`;
    }
  );

  return { markdownWithPlaceholders, images };
}

export function restoreEmbeddedImagePlaceholders(markdown: string, images: string[]) {
  let restored = markdown;

  images.forEach((image, index) => {
    const placeholder = new RegExp(String.raw`\[\[IMAGE_${index + 1}: [^\]]+\]\]`, "g");
    restored = restored.replace(placeholder, image);
  });

  const missingImages = images.filter((image) => !restored.includes(image));
  if (!missingImages.length) return restored;

  return [restored.trim(), "## 图片", missingImages.join("\n\n")]
    .filter(Boolean)
    .join("\n\n");
}
