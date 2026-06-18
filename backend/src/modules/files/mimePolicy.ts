import path from "node:path";

import { ApiError } from "../../common/apiError";

export type UploadType = "image" | "file";

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const FILE_MAX_BYTES = 30 * 1024 * 1024;
export const ABSOLUTE_MULTIPART_BODY_LIMIT_BYTES = FILE_MAX_BYTES + 1024 * 1024;

const imageMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
]);

const fileMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed"
]);

const markdownExtensions = new Set([".md", ".markdown"]);

export function inferUploadType(
  mimeType: string | null,
  requestedType?: UploadType
): UploadType {
  if (requestedType) {
    return requestedType;
  }

  return mimeType && imageMimeTypes.has(mimeType) ? "image" : "file";
}

export function assertMimeAndSizeAllowed(input: {
  type: UploadType;
  mimeType: string | null;
  originalName: string;
  sizeBytes: number;
}): void {
  const { type, mimeType, originalName, sizeBytes } = input;

  if (sizeBytes <= 0) {
    throw new ApiError("VALIDATION_ERROR", "文件不能为空", 400);
  }

  const maxBytes = type === "image" ? IMAGE_MAX_BYTES : FILE_MAX_BYTES;
  if (sizeBytes > maxBytes) {
    throw new ApiError("VALIDATION_ERROR", "文件大小超过限制", 413, {
      maxBytes,
      sizeBytes
    });
  }

  if (type === "image") {
    if (!mimeType || !imageMimeTypes.has(mimeType)) {
      throw new ApiError("VALIDATION_ERROR", "不支持的图片格式", 400, {
        allowedMimeTypes: Array.from(imageMimeTypes)
      });
    }
    return;
  }

  if (mimeType && fileMimeTypes.has(mimeType)) {
    return;
  }

  const extension = path.extname(originalName).toLowerCase();
  if (
    mimeType === "text/plain" &&
    markdownExtensions.has(extension)
  ) {
    return;
  }

  throw new ApiError("VALIDATION_ERROR", "不支持的附件格式", 400, {
    allowedMimeTypes: Array.from(fileMimeTypes)
  });
}

export function shouldDisplayInline(input: {
  type: UploadType;
  mimeType: string | null;
}): boolean {
  const mimeType = input.mimeType ?? "";

  return (
    input.type === "image" ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/")
  );
}
