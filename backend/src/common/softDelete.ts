import { config } from "../config";

export interface SoftDeleteTimestamps {
  deletedAt: Date;
  purgeAfter: Date;
}

export function getSoftDeleteTimestamps(
  now = new Date(),
  retentionDays = config.SOFT_DELETE_RETENTION_DAYS
): SoftDeleteTimestamps {
  const purgeAfter = new Date(now);
  purgeAfter.setUTCDate(purgeAfter.getUTCDate() + retentionDays);

  return {
    deletedAt: now,
    purgeAfter
  };
}
