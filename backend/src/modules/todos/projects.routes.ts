import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../common/auth";
import { dataResponse } from "../../common/http";
import { resolveRequestSession } from "../auth";
import { ProjectsService } from "./projects.service";
import {
  projectCreateSchema,
  projectIdParamsSchema,
  projectPatchSchema
} from "./todos.schemas";

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  const projectsService = new ProjectsService(app.prisma);

  app.addHook("onRequest", async (request) => {
    await resolveRequestSession(app.prisma, request);
  });

  app.get("/projects", async (request) => {
    const { userId } = requireAuth(request);
    const projects = await projectsService.listProjects(userId);

    return dataResponse(projects);
  });

  app.post("/projects", async (request, reply) => {
    const { userId } = requireAuth(request);
    const body = projectCreateSchema.parse(request.body);
    const project = await projectsService.createProject(userId, body);

    reply.status(201).send(dataResponse({ project }));
  });

  app.patch("/projects/:projectId", async (request) => {
    const { userId } = requireAuth(request);
    const { projectId } = projectIdParamsSchema.parse(request.params);
    const body = projectPatchSchema.parse(request.body);
    const project = await projectsService.updateProject(userId, projectId, body);

    return dataResponse({ project });
  });

  app.delete("/projects/:projectId", async (request) => {
    const { userId } = requireAuth(request);
    const { projectId } = projectIdParamsSchema.parse(request.params);
    const project = await projectsService.deleteProject(userId, projectId);

    return dataResponse({ project });
  });
}

export default projectsRoutes;
