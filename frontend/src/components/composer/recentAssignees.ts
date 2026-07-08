// localStorage-backed history of recently used assignee names. Persists
// across sessions so the user can quickly re-pick people they assign to often.
const RECENT_ASSIGNEES_KEY = "smarttodo.recentAssignees";
const MAX_RECENT_ASSIGNEES = 10;

export function loadRecentAssignees(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_ASSIGNEES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function persistRecentAssignees(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_ASSIGNEES_KEY,
      JSON.stringify(list.slice(0, MAX_RECENT_ASSIGNEES))
    );
  } catch {
    // ignore quota / serialization errors
  }
}

export { MAX_RECENT_ASSIGNEES };
