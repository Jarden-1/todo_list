import type { FastifyError, FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";

import { ApiError, toErrorResponse } from "../common/apiError";
import { zodErrorToDetails } from "../common/zod";

function getFastifyValidationDetails(error: FastifyError): unknown {
  if (!error.validation) {
    return {};
  }

  return {
    fields: error.validation.map((item) => ({
      path: item.instancePath || item.schemaPath,
      message: item.message ?? "Invalid value",
      code: item.keyword
    }))
  };
}

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
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

    if (fastifyError.validation) {
      reply.status(400).send(
        toErrorResponse({
          code: "VALIDATION_ERROR",
          message: "请求参数不正确",
          details: getFastifyValidationDetails(fastifyError)
        })
      );
      return;
    }

    request.log.error({ err: error }, "Unhandled request error");

    reply.status(500).send(
      toErrorResponse({
        code: "INTERNAL_SERVER_ERROR",
        // Never leak raw error.message to the client — it can expose SQL
        // fragments, file paths, or internal structure. Developers should
        // read the server logs (request.log.error above) for details.
        message: "服务暂时不可用，请稍后重试",
        details: {}
      })
    );
  });
}

export default fp(errorHandlerPlugin, {
  name: "error-handler"
});
