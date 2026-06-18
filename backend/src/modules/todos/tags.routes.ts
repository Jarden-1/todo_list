import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../common/auth";
import { dataResponse } from "../../common/http";
import { resolveRequestSession } from "../auth";
import { TagsService } from "./tags.service";
import {
  tagCreateSchema,
  tagIdParamsSchema,
  tagPatchSchema
} from "./todos.schemas";

export async function tagsRoutes(app: FastifyInstance): Promise<void> {
  const tagsService = new TagsService(app.prisma);

  app.addHook("onRequest", async (request) => {
    await resolveRequestSession(app.prisma, request);
  });

  app.get("/tags", async (request) => {
    const { userId } = requireAuth(request);
    const tags = await tagsService.listTags(userId);

    return dataResponse(tags);
  });

  app.post("/tags", async (request, reply) => {
    const { userId } = requireAuth(request);
    const body = tagCreateSchema.parse(request.body);
    const tag = await tagsService.createTag(userId, body);

    reply.status(201).send(dataResponse({ tag }));
  });

  app.patch("/tags/:tagId", async (request) => {
    const { userId } = requireAuth(request);
    const { tagId } = tagIdParamsSchema.parse(request.params);
    const body = tagPatchSchema.parse(request.body);
    const tag = await tagsService.updateTag(userId, tagId, body);

    return dataResponse({ tag });
  });

  app.delete("/tags/:tagId", async (request) => {
    const { userId } = requireAuth(request);
    const { tagId } = tagIdParamsSchema.parse(request.params);
    const tag = await tagsService.deleteTag(userId, tagId);

    return dataResponse({ tag });
  });
}

export default tagsRoutes;
