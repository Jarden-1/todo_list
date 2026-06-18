import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../common/auth";
import { dataResponse } from "../../common/http";
import { undoParamsSchema } from "./ai.schemas";
import { applyUndoRecord, getLatestUndoRecord } from "./undo.service";

export async function undoRoutes(app: FastifyInstance): Promise<void> {
  app.get("/undo/latest", async (request) => {
    const { userId } = requireAuth(request);

    return dataResponse({
      undoRecord: await getLatestUndoRecord(app.prisma, userId)
    });
  });

  app.post("/undo/:undoId/apply", async (request) => {
    const { userId } = requireAuth(request);
    const params = undoParamsSchema.parse(request.params);

    return dataResponse(await applyUndoRecord(app.prisma, userId, params.undoId));
  });
}

export default undoRoutes;
