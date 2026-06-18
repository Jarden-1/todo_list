import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../common/auth";
import { dataResponse } from "../../common/http";
import { resolveRequestSession } from "../auth";
import {
  deleteAiApiKey,
  getSettings,
  patchSettings,
  replaceSettings,
  saveAiApiKey
} from "./settings.service";
import {
  patchSettingsSchema,
  replaceSettingsSchema,
  saveAiKeySchema
} from "./settings.schemas";

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (request) => {
    await resolveRequestSession(app.prisma, request);
  });

  app.get("/settings", async (request) => {
    const { userId } = requireAuth(request);

    return dataResponse(await getSettings(app.prisma, userId));
  });

  app.put("/settings", async (request) => {
    const { userId } = requireAuth(request);
    const body = replaceSettingsSchema.parse(request.body);
    const result = await replaceSettings(app.prisma, userId, body);

    return dataResponse(result.settings);
  });

  app.patch("/settings", async (request) => {
    const { userId } = requireAuth(request);
    const body = patchSettingsSchema.parse(request.body);
    const result = await patchSettings(app.prisma, userId, body);

    return dataResponse(result.settings);
  });

  app.put("/settings/ai-key", async (request) => {
    const { userId } = requireAuth(request);
    const { apiKey } = saveAiKeySchema.parse(request.body);

    return dataResponse(await saveAiApiKey(app.prisma, userId, apiKey));
  });

  app.delete("/settings/ai-key", async (request) => {
    const { userId } = requireAuth(request);

    return dataResponse(await deleteAiApiKey(app.prisma, userId));
  });
}

export default settingsRoutes;
