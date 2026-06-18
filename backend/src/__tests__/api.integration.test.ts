import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type Redis from "ioredis";

import { buildApp } from "../app";
import { uploadDir } from "../config";
import { runPurgeSoftDeletedWorkerOnce } from "../jobs/purgeSoftDeletedWorker";
import { runReminderWorkerOnce } from "../jobs/reminderWorker";
import {
  resolveLocalStoragePath,
  writeLocalFile
} from "../modules/files/localDiskStorage";
import { createFakeRedis, createInMemoryPrisma } from "./inMemoryPrisma";

function jsonHeaders(cookie?: string): Record<string, string> {
  return {
    "content-type": "application/json",
    ...(cookie ? { cookie } : {})
  };
}

function getSessionCookie(setCookie: string | string[] | undefined): string {
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(raw, "expected Set-Cookie header");
  return raw.split(";")[0] ?? raw;
}

async function registerAndGetCookie(
  app: FastifyInstance,
  input: {
    loginName: string;
    password?: string;
    displayName?: string;
  }
): Promise<string> {
  const register = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: jsonHeaders(),
    payload: JSON.stringify({
      loginName: input.loginName,
      password: input.password ?? "demo123",
      displayName: input.displayName
    })
  });

  assert.equal(register.statusCode, 201);
  return getSessionCookie(register.headers["set-cookie"]);
}

function multipartBody(input: {
  boundary: string;
  fields?: Record<string, string>;
  file: {
    fieldName: string;
    filename: string;
    contentType: string;
    data: Buffer;
  };
}): Buffer {
  const chunks: Buffer[] = [];

  for (const [name, value] of Object.entries(input.fields ?? {})) {
    chunks.push(
      Buffer.from(
        `--${input.boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      )
    );
  }

  chunks.push(
    Buffer.from(
      `--${input.boundary}\r\nContent-Disposition: form-data; name="${input.file.fieldName}"; filename="${input.file.filename}"\r\nContent-Type: ${input.file.contentType}\r\n\r\n`
    ),
    input.file.data,
    Buffer.from(`\r\n--${input.boundary}--\r\n`)
  );

  return Buffer.concat(chunks);
}

test("first-phase API integration flow", async () => {
  const prisma = createInMemoryPrisma();
  const app = await buildApp({
    prisma: prisma as unknown as PrismaClient,
    redis: createFakeRedis() as unknown as Redis
  });

  try {
    const unauthorized = await app.inject({
      method: "GET",
      url: "/api/v1/workspace/bootstrap"
    });
    assert.equal(unauthorized.statusCode, 401);
    assert.equal(unauthorized.json().error.code, "UNAUTHORIZED");

    const loginName = `ai7-${Date.now()}`;
    const register = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: jsonHeaders(),
      payload: JSON.stringify({
        loginName,
        password: "demo123",
        displayName: "AI 7"
      })
    });
    assert.equal(register.statusCode, 201);
    assert.equal(register.json().data.user.loginName, loginName);
    const registerCookie = getSessionCookie(register.headers["set-cookie"]);

    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie: registerCookie }
    });
    assert.equal(me.statusCode, 200);
    assert.equal(me.json().data.user.displayName, "AI 7");

    const logout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { cookie: registerCookie }
    });
    assert.equal(logout.statusCode, 200);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: jsonHeaders(),
      payload: JSON.stringify({
        loginName,
        password: "demo123"
      })
    });
    assert.equal(login.statusCode, 200);
    const cookie = getSessionCookie(login.headers["set-cookie"]);

    const settingsBefore = await app.inject({
      method: "GET",
      url: "/api/v1/settings",
      headers: { cookie }
    });
    assert.equal(settingsBefore.statusCode, 200);
    assert.equal(settingsBefore.json().data.aiModel.hasApiKey, false);

    const saveKey = await app.inject({
      method: "PUT",
      url: "/api/v1/settings/ai-key",
      headers: jsonHeaders(cookie),
      payload: JSON.stringify({
        apiKey: "sk-test-secret"
      })
    });
    assert.equal(saveKey.statusCode, 200);
    assert.equal(saveKey.json().data.hasApiKey, true);

    const settingsAfter = await app.inject({
      method: "GET",
      url: "/api/v1/settings",
      headers: { cookie }
    });
    assert.equal(settingsAfter.statusCode, 200);
    assert.equal(settingsAfter.json().data.aiModel.hasApiKey, true);
    assert.equal(JSON.stringify(settingsAfter.json()).includes("sk-test-secret"), false);

    const createTodo = await app.inject({
      method: "POST",
      url: "/api/v1/todos",
      headers: jsonHeaders(cookie),
      payload: JSON.stringify({
        title: "Write integration tests",
        priority: "high",
        contentMarkdown: ""
      })
    });
    assert.equal(createTodo.statusCode, 201);
    const deletedTodoId = createTodo.json().data.todo.id;

    const deleteTodo = await app.inject({
      method: "DELETE",
      url: `/api/v1/todos/${deletedTodoId}`,
      headers: { cookie }
    });
    assert.equal(deleteTodo.statusCode, 200);
    const deletedTodo = deleteTodo.json().data.todo;
    assert.ok(deletedTodo.deletedAt);
    assert.ok(deletedTodo.purgeAfter);
    assert.equal(
      new Date(deletedTodo.purgeAfter).getTime() -
        new Date(deletedTodo.deletedAt).getTime(),
      3 * 24 * 60 * 60 * 1000
    );

    const createActiveTodo = await app.inject({
      method: "POST",
      url: "/api/v1/todos",
      headers: jsonHeaders(cookie),
      payload: JSON.stringify({
        title: "Bootstrap visible task"
      })
    });
    assert.equal(createActiveTodo.statusCode, 201);
    const activeTodoId = createActiveTodo.json().data.todo.id;

    const boundary = "----smarttodo-test-boundary";
    const filePayload = multipartBody({
      boundary,
      fields: { type: "file" },
      file: {
        fieldName: "file",
        filename: "note.txt",
        contentType: "text/plain",
        data: Buffer.from("hello file")
      }
    });
    const upload = await app.inject({
      method: "POST",
      url: "/api/v1/files",
      headers: {
        cookie,
        "content-type": `multipart/form-data; boundary=${boundary}`
      },
      payload: filePayload
    });
    assert.equal(upload.statusCode, 201);
    const file = upload.json().data.file;
    assert.equal(file.name, "note.txt");
    assert.equal(file.mimeType, "text/plain");
    assert.equal(file.size, Buffer.byteLength("hello file"));
    assert.equal(file.url, `/api/v1/files/${file.id}/content`);
    const uploadedAttachment = prisma.__state.attachments[0];
    assert.ok(uploadedAttachment);
    assert.equal(uploadedAttachment.storageProvider, "local");
    assert.equal(
      await fs.readFile(resolveLocalStoragePath(uploadedAttachment.storageKey), "utf8"),
      "hello file"
    );

    const fileContent = await app.inject({
      method: "GET",
      url: `/api/v1/files/${file.id}/content`,
      headers: { cookie }
    });
    assert.equal(fileContent.statusCode, 200);
    assert.equal(fileContent.headers["content-type"], "text/plain");

    const subscription = await app.inject({
      method: "POST",
      url: "/api/v1/push/subscriptions",
      headers: jsonHeaders(cookie),
      payload: JSON.stringify({
        endpoint: "https://push.example.test/subscription/1",
        keys: {
          p256dh: "p256dh-test-key",
          auth: "auth-test-key"
        },
        deviceName: "Test Browser"
      })
    });
    assert.equal(subscription.statusCode, 201);
    assert.equal(subscription.json().data.subscription.enabled, true);

    const bootstrap = await app.inject({
      method: "GET",
      url: "/api/v1/workspace/bootstrap",
      headers: { cookie }
    });
    assert.equal(bootstrap.statusCode, 200);
    const workspace = bootstrap.json().data;
    assert.equal(workspace.user.loginName, loginName);
    assert.equal(workspace.settings.aiModel.hasApiKey, true);
    assert.deepEqual(workspace.projects, []);
    assert.deepEqual(workspace.tags, []);
    assert.equal(workspace.undoRecord, null);
    assert.ok(!Number.isNaN(Date.parse(workspace.serverTime)));
    assert.equal(
      workspace.todos.some((todo: { id: string }) => todo.id === activeTodoId),
      true
    );
    assert.equal(
      workspace.todos.some((todo: { id: string }) => todo.id === deletedTodoId),
      false
    );
  } finally {
    await app.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
});

test("auth uniqueness and user-scoped todo access", async () => {
  const prisma = createInMemoryPrisma();
  const app = await buildApp({
    prisma: prisma as unknown as PrismaClient,
    redis: createFakeRedis() as unknown as Redis
  });

  try {
    const suffix = Date.now();
    const ownerCookie = await registerAndGetCookie(app, {
      loginName: `Owner-${suffix}`,
      displayName: "Owner"
    });

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: jsonHeaders(),
      payload: JSON.stringify({
        loginName: `owner-${suffix}`,
        password: "demo123",
        displayName: "Duplicate"
      })
    });
    assert.equal(duplicate.statusCode, 409);
    assert.equal(duplicate.json().error.code, "LOGIN_NAME_TAKEN");

    const outsiderCookie = await registerAndGetCookie(app, {
      loginName: `outsider-${suffix}`,
      displayName: "Outsider"
    });

    const createTodo = await app.inject({
      method: "POST",
      url: "/api/v1/todos",
      headers: jsonHeaders(ownerCookie),
      payload: JSON.stringify({
        title: "Owner-only task"
      })
    });
    assert.equal(createTodo.statusCode, 201);
    const todoId = createTodo.json().data.todo.id;

    const outsiderList = await app.inject({
      method: "GET",
      url: "/api/v1/todos",
      headers: { cookie: outsiderCookie }
    });
    assert.equal(outsiderList.statusCode, 200);
    assert.deepEqual(outsiderList.json().data, []);

    const outsiderGet = await app.inject({
      method: "GET",
      url: `/api/v1/todos/${todoId}`,
      headers: { cookie: outsiderCookie }
    });
    assert.equal(outsiderGet.statusCode, 404);

    const ownerGet = await app.inject({
      method: "GET",
      url: `/api/v1/todos/${todoId}`,
      headers: { cookie: ownerCookie }
    });
    assert.equal(ownerGet.statusCode, 200);
    assert.equal(ownerGet.json().data.todo.title, "Owner-only task");
  } finally {
    await app.close();
  }
});

test("default due reminders are recomputed and completed todos do not notify", async () => {
  const prisma = createInMemoryPrisma();
  const redis = createFakeRedis() as unknown as Redis;
  const app = await buildApp({
    prisma: prisma as unknown as PrismaClient,
    redis
  });

  try {
    const cookie = await registerAndGetCookie(app, {
      loginName: `reminder-${Date.now()}`,
      displayName: "Reminder User"
    });
    const dueAt = "2026-06-18T10:00:00.000Z";

    const createTodo = await app.inject({
      method: "POST",
      url: "/api/v1/todos",
      headers: jsonHeaders(cookie),
      payload: JSON.stringify({
        title: "Timed task",
        dueAt
      })
    });
    assert.equal(createTodo.statusCode, 201);
    const todo = createTodo.json().data.todo;
    assert.equal(todo.reminders.length, 1);
    assert.equal(todo.reminders[0].remindAt, "2026-06-18T09:45:00.000Z");

    const patchSettings = await app.inject({
      method: "PATCH",
      url: "/api/v1/settings",
      headers: jsonHeaders(cookie),
      payload: JSON.stringify({
        ringtone: {
          advanceMinutes: 30
        }
      })
    });
    assert.equal(patchSettings.statusCode, 200);

    const refreshedTodo = await app.inject({
      method: "GET",
      url: `/api/v1/todos/${todo.id}`,
      headers: { cookie }
    });
    assert.equal(refreshedTodo.statusCode, 200);
    const refreshedReminders = refreshedTodo.json().data.todo.reminders;
    assert.equal(refreshedReminders.length, 1);
    assert.equal(refreshedReminders[0].remindAt, "2026-06-18T09:30:00.000Z");

    const due = await app.inject({
      method: "GET",
      url: "/api/v1/reminders/due?before=2026-06-18T09:31:00.000Z",
      headers: { cookie }
    });
    assert.equal(due.statusCode, 200);
    assert.equal(due.json().data.length, 1);
    assert.equal(due.json().data[0].todoId, todo.id);

    const complete = await app.inject({
      method: "POST",
      url: `/api/v1/todos/${todo.id}/complete`,
      headers: { cookie }
    });
    assert.equal(complete.statusCode, 200);

    const dueAfterComplete = await app.inject({
      method: "GET",
      url: "/api/v1/reminders/due?before=2026-06-18T11:00:00.000Z",
      headers: { cookie }
    });
    assert.equal(dueAfterComplete.statusCode, 200);
    assert.deepEqual(dueAfterComplete.json().data, []);

    const workerResult = await runReminderWorkerOnce({
      prisma: prisma as unknown as PrismaClient,
      redis,
      now: () => new Date("2026-06-18T11:00:00.000Z")
    });
    assert.equal(workerResult.scanned, 0);
    assert.equal(workerResult.created, 0);
    assert.equal(prisma.__state.notificationEvents.length, 0);
  } finally {
    await app.close();
  }
});

test("workspace import replaces only the current user's data", async () => {
  const prisma = createInMemoryPrisma();
  const app = await buildApp({
    prisma: prisma as unknown as PrismaClient,
    redis: createFakeRedis() as unknown as Redis
  });

  try {
    const suffix = Date.now();
    const ownerCookie = await registerAndGetCookie(app, {
      loginName: `workspace-${suffix}`
    });
    const otherCookie = await registerAndGetCookie(app, {
      loginName: `workspace-other-${suffix}`
    });

    const project = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      headers: jsonHeaders(ownerCookie),
      payload: JSON.stringify({
        name: "Original Project",
        color: "#2563EB"
      })
    });
    assert.equal(project.statusCode, 201);
    const projectId = project.json().data.project.id;

    const tag = await app.inject({
      method: "POST",
      url: "/api/v1/tags",
      headers: jsonHeaders(ownerCookie),
      payload: JSON.stringify({
        name: "Original Tag",
        color: "#16A34A"
      })
    });
    assert.equal(tag.statusCode, 201);
    const tagId = tag.json().data.tag.id;

    const originalTodo = await app.inject({
      method: "POST",
      url: "/api/v1/todos",
      headers: jsonHeaders(ownerCookie),
      payload: JSON.stringify({
        title: "Original Todo",
        projectId,
        tagIds: [tagId],
        subtasks: [{ title: "Keep this subtask" }]
      })
    });
    assert.equal(originalTodo.statusCode, 201);

    const backupResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspace/export",
      headers: { cookie: ownerCookie }
    });
    assert.equal(backupResponse.statusCode, 200);
    const backup = backupResponse.json().data;

    const extraOwnerTodo = await app.inject({
      method: "POST",
      url: "/api/v1/todos",
      headers: jsonHeaders(ownerCookie),
      payload: JSON.stringify({
        title: "Temporary Owner Todo"
      })
    });
    assert.equal(extraOwnerTodo.statusCode, 201);

    const otherTodo = await app.inject({
      method: "POST",
      url: "/api/v1/todos",
      headers: jsonHeaders(otherCookie),
      payload: JSON.stringify({
        title: "Other User Todo"
      })
    });
    assert.equal(otherTodo.statusCode, 201);

    const importResponse = await app.inject({
      method: "PUT",
      url: "/api/v1/workspace/import",
      headers: jsonHeaders(ownerCookie),
      payload: JSON.stringify({
        mode: "replace",
        backup
      })
    });
    assert.equal(importResponse.statusCode, 200);
    assert.equal(importResponse.json().data.imported.todos, 1);

    const ownerBootstrap = await app.inject({
      method: "GET",
      url: "/api/v1/workspace/bootstrap",
      headers: { cookie: ownerCookie }
    });
    assert.equal(ownerBootstrap.statusCode, 200);
    const ownerWorkspace = ownerBootstrap.json().data;
    assert.deepEqual(
      ownerWorkspace.todos.map((item: { title: string }) => item.title),
      ["Original Todo"]
    );
    assert.equal(ownerWorkspace.projects[0].name, "Original Project");
    assert.equal(ownerWorkspace.tags[0].name, "Original Tag");
    assert.equal(ownerWorkspace.todos[0].subtasks[0].title, "Keep this subtask");

    const otherTodos = await app.inject({
      method: "GET",
      url: "/api/v1/todos",
      headers: { cookie: otherCookie }
    });
    assert.equal(otherTodos.statusCode, 200);
    assert.deepEqual(
      otherTodos.json().data.map((item: { title: string }) => item.title),
      ["Other User Todo"]
    );
  } finally {
    await app.close();
  }
});

test("empty settings patch is rejected", async () => {
  const prisma = createInMemoryPrisma();
  const app = await buildApp({
    prisma: prisma as unknown as PrismaClient,
    redis: createFakeRedis() as unknown as Redis
  });

  try {
    const cookie = await registerAndGetCookie(app, {
      loginName: `settings-${Date.now()}`
    });
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/settings",
      headers: jsonHeaders(cookie),
      payload: JSON.stringify({})
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
  } finally {
    await app.close();
  }
});

test("purge worker removes expired soft-deleted attachment rows and local files", async () => {
  const prisma = createInMemoryPrisma();
  const redis = createFakeRedis() as unknown as Redis;
  const now = new Date("2026-06-18T08:00:00.000Z");
  const storageKey = "usr_worker/2026/06/file_worker";

  await writeLocalFile({
    storageKey,
    data: Buffer.from("expired attachment")
  });

  prisma.__state.attachments.push({
    id: "file_worker",
    userId: "usr_worker",
    todoId: null,
    type: "file",
    originalName: "expired.txt",
    mimeType: "text/plain",
    sizeBytes: BigInt(18),
    checksumSha256: null,
    storageProvider: "local",
    storageKey,
    contentUrl: "/api/v1/files/file_worker/content",
    createdAt: new Date("2026-06-14T08:00:00.000Z"),
    deletedAt: new Date("2026-06-15T08:00:00.000Z"),
    purgeAfter: now
  });

  try {
    const result = await runPurgeSoftDeletedWorkerOnce({
      prisma,
      redis,
      now: () => now
    });

    assert.equal(result.attachments, 1);
    assert.equal(result.localFilesDeleted, 1);
    assert.equal(prisma.__state.attachments.length, 0);

    await assert.rejects(
      fs.access(`${uploadDir}/${storageKey}`),
      (error) => (error as NodeJS.ErrnoException).code === "ENOENT"
    );
  } finally {
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
});
