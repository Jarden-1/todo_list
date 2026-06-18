import { randomUUID } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";
import type Redis from "ioredis";

import { removeLocalFileIfExists } from "../modules/files/localDiskStorage";

const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LOCK_KEY = "smarttodo:jobs:purge-soft-deleted-worker:lock";
const LOCK_TTL_MS = 10 * 60 * 1000;

type LoggerLike = {
  info: (payload: unknown, message?: string) => void;
  warn: (payload: unknown, message?: string) => void;
  error: (payload: unknown, message?: string) => void;
};

export interface PurgeSoftDeletedWorkerDeps {
  prisma: PrismaClient;
  redis?: Redis;
  logger?: LoggerLike;
  batchSize?: number;
  now?: () => Date;
}

export interface PurgeSoftDeletedWorkerResult {
  todos: number;
  projects: number;
  tags: number;
  subtasks: number;
  reminders: number;
  attachments: number;
  todoTags: number;
  notifications: number;
  undoRecords: number;
  localFilesDeleted: number;
  localFilesFailed: number;
}

export interface PurgeSoftDeletedWorkerHandle {
  runNow: () => Promise<PurgeSoftDeletedWorkerResult>;
  stop: () => void;
}

interface PurgeCandidates {
  todoIds: string[];
  projectIds: string[];
  tagIds: string[];
  subtaskIds: string[];
  reminderIds: string[];
  attachmentIds: string[];
  localStorageKeys: string[];
}

function emptyResult(): PurgeSoftDeletedWorkerResult {
  return {
    todos: 0,
    projects: 0,
    tags: 0,
    subtasks: 0,
    reminders: 0,
    attachments: 0,
    todoTags: 0,
    notifications: 0,
    undoRecords: 0,
    localFilesDeleted: 0,
    localFilesFailed: 0
  };
}

function dueSoftDeletedWhere(now: Date): {
  deletedAt: { not: null };
  purgeAfter: { lte: Date };
} {
  return {
    deletedAt: { not: null },
    purgeAfter: { lte: now }
  };
}

async function acquireLock(redis: Redis | undefined): Promise<string | null> {
  if (!redis) {
    return randomUUID();
  }

  const token = randomUUID();
  const acquired = await redis.set(LOCK_KEY, token, "PX", LOCK_TTL_MS, "NX");
  return acquired === "OK" ? token : null;
}

async function releaseLock(
  redis: Redis | undefined,
  token: string
): Promise<void> {
  if (!redis) {
    return;
  }

  await redis.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    1,
    LOCK_KEY,
    token
  );
}

async function collectCandidates(
  prisma: PrismaClient,
  now: Date,
  batchSize: number
): Promise<PurgeCandidates> {
  const [todos, projects, tags, dueSubtasks, dueReminders, dueAttachments] =
    await Promise.all([
      prisma.todo.findMany({
        where: dueSoftDeletedWhere(now),
        select: { id: true },
        take: batchSize
      }),
      prisma.project.findMany({
        where: dueSoftDeletedWhere(now),
        select: { id: true },
        take: batchSize
      }),
      prisma.tag.findMany({
        where: dueSoftDeletedWhere(now),
        select: { id: true },
        take: batchSize
      }),
      prisma.subtask.findMany({
        where: dueSoftDeletedWhere(now),
        select: { id: true },
        take: batchSize
      }),
      prisma.reminder.findMany({
        where: dueSoftDeletedWhere(now),
        select: { id: true },
        take: batchSize
      }),
      prisma.attachment.findMany({
        where: dueSoftDeletedWhere(now),
        select: { id: true },
        take: batchSize
      })
    ]);

  const todoIds = todos.map((todo) => todo.id);
  const projectIds = projects.map((project) => project.id);
  const tagIds = tags.map((tag) => tag.id);

  const [subtasksForTodos, remindersForTodos, attachmentsForTodos] =
    todoIds.length > 0
      ? await Promise.all([
          prisma.subtask.findMany({
            where: { todoId: { in: todoIds } },
            select: { id: true }
          }),
          prisma.reminder.findMany({
            where: { todoId: { in: todoIds } },
            select: { id: true }
          }),
          prisma.attachment.findMany({
            where: { todoId: { in: todoIds } },
            select: { id: true }
          })
        ])
      : [[], [], []];

  const attachmentIds = Array.from(
    new Set([
      ...dueAttachments.map((attachment) => attachment.id),
      ...attachmentsForTodos.map((attachment) => attachment.id)
    ])
  );
  const attachments =
    attachmentIds.length > 0
      ? await prisma.attachment.findMany({
          where: { id: { in: attachmentIds } },
          select: {
            storageProvider: true,
            storageKey: true
          }
        })
      : [];

  return {
    todoIds,
    projectIds,
    tagIds,
    subtaskIds: Array.from(
      new Set([
        ...dueSubtasks.map((subtask) => subtask.id),
        ...subtasksForTodos.map((subtask) => subtask.id)
      ])
    ),
    reminderIds: Array.from(
      new Set([
        ...dueReminders.map((reminder) => reminder.id),
        ...remindersForTodos.map((reminder) => reminder.id)
      ])
    ),
    attachmentIds,
    localStorageKeys: attachments
      .filter((attachment) => attachment.storageProvider === "local")
      .map((attachment) => attachment.storageKey)
  };
}

function idIn(ids: string[]): { in: string[] } | undefined {
  return ids.length > 0 ? { in: ids } : undefined;
}

function notificationWhere(
  now: Date,
  candidates: PurgeCandidates
): Prisma.NotificationEventWhereInput {
  return {
    OR: [
      dueSoftDeletedWhere(now),
      ...(candidates.todoIds.length > 0
        ? [{ todoId: { in: candidates.todoIds } }]
        : []),
      ...(candidates.reminderIds.length > 0
        ? [{ reminderId: { in: candidates.reminderIds } }]
        : [])
    ]
  };
}

async function deleteCandidateRows(
  prisma: PrismaClient,
  now: Date,
  candidates: PurgeCandidates
): Promise<PurgeSoftDeletedWorkerResult> {
  const result = emptyResult();

  await prisma.$transaction(async (tx) => {
    result.notifications = (
      await tx.notificationEvent.deleteMany({
        where: notificationWhere(now, candidates)
      })
    ).count;

    result.todoTags =
      candidates.todoIds.length > 0 || candidates.tagIds.length > 0
        ? (
            await tx.todoTag.deleteMany({
              where: {
                OR: [
                  ...(candidates.todoIds.length > 0
                    ? [{ todoId: { in: candidates.todoIds } }]
                    : []),
                  ...(candidates.tagIds.length > 0
                    ? [{ tagId: { in: candidates.tagIds } }]
                    : [])
                ]
              }
            })
          ).count
        : 0;

    result.subtasks = candidates.subtaskIds.length
      ? (
          await tx.subtask.deleteMany({
            where: { id: idIn(candidates.subtaskIds) }
          })
        ).count
      : 0;

    result.reminders = candidates.reminderIds.length
      ? (
          await tx.reminder.deleteMany({
            where: { id: idIn(candidates.reminderIds) }
          })
        ).count
      : 0;

    result.attachments = candidates.attachmentIds.length
      ? (
          await tx.attachment.deleteMany({
            where: { id: idIn(candidates.attachmentIds) }
          })
        ).count
      : 0;

    result.undoRecords = candidates.todoIds.length
      ? (
          await tx.undoRecord.deleteMany({
            where: { todoId: { in: candidates.todoIds } }
          })
        ).count
      : 0;

    result.todos = candidates.todoIds.length
      ? (
          await tx.todo.deleteMany({
            where: { id: idIn(candidates.todoIds) }
          })
        ).count
      : 0;

    result.projects = candidates.projectIds.length
      ? (
          await tx.project.deleteMany({
            where: { id: idIn(candidates.projectIds) }
          })
        ).count
      : 0;

    result.tags = candidates.tagIds.length
      ? (
          await tx.tag.deleteMany({
            where: { id: idIn(candidates.tagIds) }
          })
        ).count
      : 0;
  });

  return result;
}

async function deleteLocalFiles(
  storageKeys: string[],
  deps: PurgeSoftDeletedWorkerDeps
): Promise<Pick<PurgeSoftDeletedWorkerResult, "localFilesDeleted" | "localFilesFailed">> {
  let localFilesDeleted = 0;
  let localFilesFailed = 0;

  for (const storageKey of storageKeys) {
    try {
      await removeLocalFileIfExists(storageKey);
      localFilesDeleted += 1;
    } catch (error) {
      localFilesFailed += 1;
      deps.logger?.warn(
        {
          storageKey,
          error
        },
        "Failed to delete purged attachment file"
      );
    }
  }

  return {
    localFilesDeleted,
    localFilesFailed
  };
}

export async function runPurgeSoftDeletedWorkerOnce(
  deps: PurgeSoftDeletedWorkerDeps
): Promise<PurgeSoftDeletedWorkerResult> {
  const token = await acquireLock(deps.redis);

  if (!token) {
    deps.logger?.info(
      { lockKey: LOCK_KEY },
      "Purge soft-deleted worker lock not acquired"
    );
    return emptyResult();
  }

  try {
    const now = deps.now?.() ?? new Date();
    const candidates = await collectCandidates(
      deps.prisma,
      now,
      deps.batchSize ?? DEFAULT_BATCH_SIZE
    );
    const result = await deleteCandidateRows(deps.prisma, now, candidates);
    const fileResult = await deleteLocalFiles(candidates.localStorageKeys, deps);

    return {
      ...result,
      ...fileResult
    };
  } finally {
    await releaseLock(deps.redis, token);
  }
}

export function startPurgeSoftDeletedWorker(
  deps: PurgeSoftDeletedWorkerDeps,
  intervalMs = DEFAULT_INTERVAL_MS
): PurgeSoftDeletedWorkerHandle {
  let running = false;

  const runNow = async (): Promise<PurgeSoftDeletedWorkerResult> => {
    if (running) {
      return emptyResult();
    }

    running = true;

    try {
      return await runPurgeSoftDeletedWorkerOnce(deps);
    } catch (error) {
      deps.logger?.error({ err: error }, "Purge soft-deleted worker failed");
      throw error;
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void runNow().catch(() => undefined);
  }, intervalMs);

  void runNow().catch(() => undefined);

  return {
    runNow,
    stop: () => clearInterval(timer)
  };
}
