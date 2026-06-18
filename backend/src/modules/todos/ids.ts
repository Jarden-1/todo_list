import { randomUUID } from "node:crypto";

export function createEntityId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}
