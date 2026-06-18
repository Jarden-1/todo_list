import type { AuthUser } from "./authApi";
import { apiRequest } from "./apiClient";
import type { ServerAppSettings } from "./settingsTypes";
import type { Project, Tag, Todo, UndoRecord } from "./types";

export interface WorkspaceBootstrap {
  user: AuthUser;
  settings: ServerAppSettings;
  projects: Project[];
  tags: Tag[];
  todos: Todo[];
  undoRecord: UndoRecord | null;
  serverTime: string;
}

export interface WorkspaceBackup {
  app: "SmartTodo";
  exportedAt: string;
  settings?: ServerAppSettings;
  data: {
    todos: Todo[];
    projects: Project[];
    tags: Tag[];
    undoRecord: UndoRecord | null;
  };
}

export function fetchWorkspaceBootstrap(signal?: AbortSignal) {
  return apiRequest<WorkspaceBootstrap>("/workspace/bootstrap", { signal });
}

export function exportWorkspace() {
  return apiRequest<WorkspaceBackup>("/workspace/export");
}

export function importWorkspace(backup: WorkspaceBackup | unknown) {
  return apiRequest<{ mode: "replace"; deleted: unknown; imported: unknown }>(
    "/workspace/import",
    {
      method: "PUT",
      body: JSON.stringify({ backup }),
    }
  );
}

export function clearWorkspace() {
  return apiRequest<{
    ok: boolean;
    deletedAt: string;
    purgeAfter: string;
    counts: Record<string, number>;
  }>("/workspace", { method: "DELETE" });
}
