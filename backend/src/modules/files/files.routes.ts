import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { ApiError, toErrorResponse } from "../../common/apiError";
import { requireAuth } from "../../common/auth";
import { dataResponse } from "../../common/http";
import { zodErrorToDetails } from "../../common/zod";
import { config } from "../../config";
import {
  attachFilesBodySchema,
  fileIdParamsSchema,
  todoAttachmentParamsSchema,
  todoIdParamsSchema,
  uploadFieldsSchema
} from "./files.schemas";
import {
  attachFilesToTodo,
  getFileContent,
  getFileMetadata,
  removeAttachmentFromTodo,
  softDeleteFile,
  uploadFile
} from "./files.service";
import { ABSOLUTE_MULTIPART_BODY_LIMIT_BYTES } from "./mimePolicy";
import { parseMultipartFormData } from "./multipartParser";

function installFilesErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const fastifyError = error as FastifyError;

    if (error instanceof ApiError) {
      reply.status(error.statusCode).send(
        toErrorResponse({
          code: error.code,
          message: error.message,
          details: error.details
        })
      );
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send(
        toErrorResponse({
          code: "VALIDATION_ERROR",
          message: "请求参数不正确",
          details: zodErrorToDetails(error)
        })
      );
      return;
    }

    if (fastifyError.statusCode === 413) {
      reply.status(413).send(
        toErrorResponse({
          code: "VALIDATION_ERROR",
          message: "文件大小超过限制",
          details: {
            maxBytes: ABSOLUTE_MULTIPART_BODY_LIMIT_BYTES
          }
        })
      );
      return;
    }

    request.log.error({ err: error }, "Unhandled files module error");

    reply.status(500).send(
      toErrorResponse({
        code: "INTERNAL_SERVER_ERROR",
        message:
          config.NODE_ENV === "production"
            ? "服务暂时不可用"
            : error instanceof Error
              ? error.message || "Internal server error"
              : "Internal server error",
        details: {}
      })
    );
  });
}

export default async function filesRoutes(app: FastifyInstance): Promise<void> {
  installFilesErrorHandler(app);

  app.addContentTypeParser(
    /^multipart\/form-data/i,
    {
      parseAs: "buffer",
      bodyLimit: ABSOLUTE_MULTIPART_BODY_LIMIT_BYTES
    },
    (_request, body, done) => {
      done(null, body);
    }
  );

  app.post(
    "/files",
    {
      bodyLimit: ABSOLUTE_MULTIPART_BODY_LIMIT_BYTES
    },
    async (request, reply) => {
      const auth = requireAuth(request);
      const form = parseMultipartFormData({
        body: request.body,
        contentType: request.headers["content-type"]
      });

      if (!form.file) {
        throw new ApiError("VALIDATION_ERROR", "file 为必填字段", 400);
      }

      const fields = uploadFieldsSchema.parse(form.fields);
      const file = await uploadFile(app.prisma, {
        userId: auth.userId,
        todoId: fields.todoId,
        requestedType: fields.type,
        originalName: form.file.originalName,
        mimeType: form.file.mimeType,
        data: form.file.data
      });

      reply.status(201).send(dataResponse({ file }));
    }
  );

  app.get("/files/:fileId", async (request) => {
    const auth = requireAuth(request);
    const { fileId } = fileIdParamsSchema.parse(request.params);
    const file = await getFileMetadata(app.prisma, auth.userId, fileId);

    return dataResponse({ file });
  });

  app.get("/files/:fileId/content", async (request, reply) => {
    const auth = requireAuth(request);
    const { fileId } = fileIdParamsSchema.parse(request.params);
    const content = await getFileContent(app.prisma, auth.userId, fileId);

    reply
      .header("Content-Type", content.contentType)
      .header("Content-Length", String(content.contentLength))
      .header("Content-Disposition", content.contentDisposition)
      .header("Cache-Control", "private, no-store")
      .send(content.stream);
  });

  app.delete("/files/:fileId", async (request) => {
    const auth = requireAuth(request);
    const { fileId } = fileIdParamsSchema.parse(request.params);

    await softDeleteFile(app.prisma, auth.userId, fileId);

    return dataResponse({ ok: true });
  });

  app.post("/todos/:todoId/attachments", async (request) => {
    const auth = requireAuth(request);
    const { todoId } = todoIdParamsSchema.parse(request.params);
    const body = attachFilesBodySchema.parse(request.body);
    const files = await attachFilesToTodo(app.prisma, {
      userId: auth.userId,
      todoId,
      attachmentIds: body.attachmentIds
    });

    return dataResponse({ files });
  });

  app.delete(
    "/todos/:todoId/attachments/:fileId",
    async (request) => {
      const auth = requireAuth(request);
      const { todoId, fileId } = todoAttachmentParamsSchema.parse(request.params);

      await removeAttachmentFromTodo(app.prisma, {
        userId: auth.userId,
        todoId,
        fileId
      });

      return dataResponse({ ok: true });
    }
  );
}
