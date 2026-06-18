import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../common/auth";
import { dataResponse } from "../../common/http";
import { resolveRequestSession } from "../auth";
import {
  clearWorkspace,
  exportWorkspace,
  getWorkspaceBootstrap,
  importWorkspace
} from "./workspace.service";
import { workspaceImportSchema } from "./workspace.schemas";

export async function workspaceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (request) => {
    await resolveRequestSession(app.prisma, request);
  });

  app.get("/workspace/bootstrap", async (request) => {
    const { userId } = requireAuth(request);

    return dataResponse(await getWorkspaceBootstrap(app.prisma, userId));
  });

  app.get("/workspace/export", async (request, reply) => {
    const { userId } = requireAuth(request);
    const backup = await exportWorkspace(app.prisma, userId);

    reply.header(
      "Content-Disposition",
      `attachment; filename="smarttodo-backup-${backup.exportedAt.slice(0, 10)}.json"`
    );

    return dataResponse(backup);
  });

  app.put("/workspace/import", async (request) => {
    const { userId } = requireAuth(request);
    const body = workspaceImportSchema.parse(request.body);
    const result = await importWorkspace(app.prisma, userId, body.backup);

    return dataResponse(result);
  });

  app.delete("/workspace", async (request) => {
    const { userId } = requireAuth(request);

    return dataResponse(await clearWorkspace(app.prisma, userId));
  });
}

export default workspaceRoutes;
