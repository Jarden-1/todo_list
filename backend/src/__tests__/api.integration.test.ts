import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";

import { buildApp } from "../app";
import { uploadDir } from "../config";
import { runPurgeSoftDeletedWorkerOnce } from "../jobs/purgeSoftDeletedWorker";
import { writeLocalFile } from "../modules/files/localDiskStorage";
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
    assert.equal(prisma.__state.attachments[0]?.storageProvider, "local");

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
