import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../common/auth";
import { dataResponse } from "../../common/http";
import {
  markdownPolishRequestSchema,
  todoOrganizationRequestSchema
} from "./ai.schemas";
import { organizeTodoWithAi, polishMarkdownWithAi } from "./ai.service";

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.post("/ai/todo-organizations", async (request, reply) => {
    const { userId } = requireAuth(request);
    const body = todoOrganizationRequestSchema.parse(request.body);
    const result = await organizeTodoWithAi(app.prisma, userId, body);

    return reply.status(201).send(dataResponse(result));
  });

  app.post("/ai/markdown-polish", async (request) => {
    const { userId } = requireAuth(request);
    const body = markdownPolishRequestSchema.parse(request.body);

    return dataResponse(await polishMarkdownWithAi(app.prisma, userId, body));
  });
}

export default aiRoutes;
