// Shared backend constants. Keep magic values out of service code so they can
// be updated in one place.

// Fallback color for projects/tags that don't specify one.
export const DEFAULT_PROJECT_COLOR = "#6366F1";
export const DEFAULT_TAG_COLOR = "#6366F1";

// Server-side default timezone — uses the runtime's actual timezone rather
// than hardcoding "Asia/Shanghai", so deployments in other regions get
// correct due-date inference.
export const DEFAULT_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
