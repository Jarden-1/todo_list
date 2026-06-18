import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type { Stats } from "node:fs";

import type { PrismaClient } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { getSoftDeleteTimestamps } from "../../common/softDelete";
import { assertUserOwnsResource } from "../../common/userScope";
import { toFileDto, type FileDto } from "./file.dto";
import {
  assertMimeAndSizeAllowed,
  inferUploadType,
  shouldDisplayInline,
  type UploadType
} from "./mimePolicy";
import {
  buildLocalStorageKey,
  removeLocalFileIfExists,
  resolveLocalStoragePath,
  writeLocalFile
} from "./localDiskStorage";

export interface UploadFileInput {
  userId: string;
  todoId?: string;
  requestedType?: UploadType;
  originalName: string;
  mimeType: string | null;
  data: Buffer;
}

export interface FileContentResult {
  file: FileDto;
  absolutePath: string;
  contentType: string;
  contentLength: number;
  contentDisposition: string;
  stream: fs.ReadStream;
}

const STORAGE_PROVIDER = "local";

function createFileId(): string {
  return `file_${crypto.randomUUID().replace(/-/g, "")}`;
}

function checksumSha256(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function contentUrlFor(fileId: string): string {
  return `/api/v1/files/${fileId}/content`;
}

function encodeContentDispositionFilename(filename: string): string {
  return encodeURIComponent(filename).replace(/['()]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function asciiFallbackFilename(filename: string): string {
  const fallback = filename
    .replace(/["\\\r\n]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim();

  return fallback.length > 0 ? fallback : "file";
}

function buildContentDisposition(input: {
  filename: string;
  inline: boolean;
}): string {
  const disposition = input.inline ? "inline" : "attachment";
  const fallback = asciiFallbackFilename(input.filename);
  const encoded = encodeContentDispositionFilename(input.filename);

  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

async function findActiveAttachment(
  prisma: PrismaClient,
  userId: string,
  fileId: string
) {
  const attachment = await prisma.attachment.findFirst({
    where: {
      id: fileId,
      userId,
      deletedAt: null
    }
  });

  if (!attachment) {
    throw new ApiError("NOT_FOUND", "文件不存在", 404);
  }

  return attachment;
}

async function ensureTodoOwned(
  prisma: PrismaClient,
  userId: string,
  todoId: string
): Promise<void> {
  const todo = await prisma.todo.findFirst({
    where: {
      id: todoId,
      userId,
      deletedAt: null
    },
    select: {
      userId: true
    }
  });

  assertUserOwnsResource(todo?.userId, userId);
}

export async function uploadFile(
  prisma: PrismaClient,
  input: UploadFileInput
): Promise<FileDto> {
  if (input.todoId) {
    await ensureTodoOwned(prisma, input.userId, input.todoId);
  }

  const type = inferUploadType(input.mimeType, input.requestedType);
  const sizeBytes = input.data.byteLength;

  assertMimeAndSizeAllowed({
    type,
    mimeType: input.mimeType,
    originalName: input.originalName,
    sizeBytes
  });

  const now = new Date();
  const fileId = createFileId();
  const storageKey = buildLocalStorageKey({
    userId: input.userId,
    fileId,
    now
  });

  await writeLocalFile({
    storageKey,
    data: input.data
  });

  try {
    const attachment = await prisma.attachment.create({
      data: {
        id: fileId,
        userId: input.userId,
        todoId: input.todoId,
        type,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: BigInt(sizeBytes),
        checksumSha256: checksumSha256(input.data),
        storageProvider: STORAGE_PROVIDER,
        storageKey,
        contentUrl: contentUrlFor(fileId),
        createdAt: now
      }
    });

    return toFileDto(attachment);
  } catch (error) {
    await removeLocalFileIfExists(storageKey);
    throw error;
  }
}

export async function getFileMetadata(
  prisma: PrismaClient,
  userId: string,
  fileId: string
): Promise<FileDto> {
  const attachment = await findActiveAttachment(prisma, userId, fileId);
  return toFileDto(attachment);
}

export async function getFileContent(
  prisma: PrismaClient,
  userId: string,
  fileId: string
): Promise<FileContentResult> {
  const attachment = await findActiveAttachment(prisma, userId, fileId);

  if (attachment.storageProvider !== STORAGE_PROVIDER) {
    throw new ApiError("BUSINESS_ERROR", "不支持的文件存储类型", 422);
  }

  const absolutePath = resolveLocalStoragePath(attachment.storageKey);
  let stats: Stats;

  try {
    stats = await fsPromises.stat(absolutePath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      throw new ApiError("NOT_FOUND", "文件不存在", 404);
    }
    throw error;
  }

  if (!stats.isFile()) {
    throw new ApiError("NOT_FOUND", "文件不存在", 404);
  }

  const file = toFileDto(attachment);
  const inline = shouldDisplayInline({
    type: file.type,
    mimeType: file.mimeType
  });

  return {
    file,
    absolutePath,
    contentType: attachment.mimeType ?? "application/octet-stream",
    contentLength: stats.size,
    contentDisposition: buildContentDisposition({
      filename: attachment.originalName,
      inline
    }),
    stream: fs.createReadStream(absolutePath)
  };
}

export async function softDeleteFile(
  prisma: PrismaClient,
  userId: string,
  fileId: string
): Promise<void> {
  await findActiveAttachment(prisma, userId, fileId);

  const timestamps = getSoftDeleteTimestamps();

  await prisma.attachment.update({
    where: {
      id: fileId
    },
    data: timestamps
  });
}

export async function attachFilesToTodo(
  prisma: PrismaClient,
  input: {
    userId: string;
    todoId: string;
    attachmentIds: string[];
  }
): Promise<FileDto[]> {
  await ensureTodoOwned(prisma, input.userId, input.todoId);

  const uniqueAttachmentIds = Array.from(new Set(input.attachmentIds));
  const attachments = await prisma.attachment.findMany({
    where: {
      id: {
        in: uniqueAttachmentIds
      },
      userId: input.userId,
      deletedAt: null
    }
  });

  if (attachments.length !== uniqueAttachmentIds.length) {
    throw new ApiError("NOT_FOUND", "附件不存在", 404);
  }

  const attachedElsewhere = attachments.find(
    (attachment) => attachment.todoId && attachment.todoId !== input.todoId
  );

  if (attachedElsewhere) {
    throw new ApiError("BUSINESS_ERROR", "附件已绑定到其他待办", 422, {
      fileId: attachedElsewhere.id
    });
  }

  await prisma.attachment.updateMany({
    where: {
      id: {
        in: uniqueAttachmentIds
      },
      userId: input.userId,
      deletedAt: null
    },
    data: {
      todoId: input.todoId
    }
  });

  const updatedAttachments = await prisma.attachment.findMany({
    where: {
      id: {
        in: uniqueAttachmentIds
      },
      userId: input.userId,
      deletedAt: null
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return updatedAttachments.map(toFileDto);
}

export async function removeAttachmentFromTodo(
  prisma: PrismaClient,
  input: {
    userId: string;
    todoId: string;
    fileId: string;
  }
): Promise<void> {
  await ensureTodoOwned(prisma, input.userId, input.todoId);

  const attachment = await prisma.attachment.findFirst({
    where: {
      id: input.fileId,
      userId: input.userId,
      todoId: input.todoId,
      deletedAt: null
    }
  });

  if (!attachment) {
    throw new ApiError("NOT_FOUND", "附件不存在", 404);
  }

  const timestamps = getSoftDeleteTimestamps();

  await prisma.attachment.update({
    where: {
      id: input.fileId
    },
    data: timestamps
  });
}
