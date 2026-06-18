import fs from "node:fs/promises";
import path from "node:path";

import { ApiError } from "../../common/apiError";
import { uploadDir } from "../../config/env";

function toStorageSegment(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned : "_";
}

function assertInsideUploadDir(absolutePath: string): void {
  const relative = path.relative(uploadDir, absolutePath);

  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new ApiError("VALIDATION_ERROR", "非法文件路径", 400);
  }
}

export function buildLocalStorageKey(input: {
  userId: string;
  fileId: string;
  now: Date;
}): string {
  const year = String(input.now.getUTCFullYear());
  const month = String(input.now.getUTCMonth() + 1).padStart(2, "0");

  return [
    toStorageSegment(input.userId),
    year,
    month,
    toStorageSegment(input.fileId)
  ].join("/");
}

export function resolveLocalStoragePath(storageKey: string): string {
  if (path.isAbsolute(storageKey)) {
    throw new ApiError("VALIDATION_ERROR", "非法文件路径", 400);
  }

  const absolutePath = path.resolve(uploadDir, storageKey);
  assertInsideUploadDir(absolutePath);

  return absolutePath;
}

export async function writeLocalFile(input: {
  storageKey: string;
  data: Buffer;
}): Promise<string> {
  const absolutePath = resolveLocalStoragePath(input.storageKey);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.data, {
    flag: "wx",
    mode: 0o600
  });

  return absolutePath;
}

export async function removeLocalFileIfExists(storageKey: string): Promise<void> {
  const absolutePath = resolveLocalStoragePath(storageKey);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") {
      throw error;
    }
  }
}
