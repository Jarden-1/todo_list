// InlineDuePicker — flat 4-tab due-time editor for the detail panel.
//
// Layout: 4 equal-width tabs in a single row. The selected tab is highlighted;
// the other three are unstyled. When the active precision is `datetime` or
// `day`, the tab text becomes "label + value" (e.g. "精确时刻 07/08 22:39").
//
// Interaction: clicking a tab switches to that precision. Switching to
// `datetime`/`day` also auto-opens the native picker so the user can pick a
// date/time immediately. Clicking the already-active `datetime`/`day` tab
// re-opens the picker to change the value. `week`/`none` have no picker so
// they just switch.
import { useRef, type RefObject } from "react";
import type { DueAtPrecision } from "../../lib/types";
import { endOfDayIso, endOfWeekIso } from "../../lib/dateUtils";
import { toDatetimeLocalValue } from "../../lib/todoDueReminder";
import { cn } from "../../lib/utils";

interface InlineDuePickerProps {
  dueAt: string | null;
  precision: DueAtPrecision;
  overdue?: boolean;
  datetimeRef?: RefObject<HTMLInputElement | null>;
  onOpenDatetimePicker?: () => void;
  onChange: (next: { dueAt: string | null; dueAtPrecision: DueAtPrecision }) => void;
}

const TAB_ORDER: DueAtPrecision[] = ["datetime", "day", "week", "none"];

const PRECISION_LABEL: Record<DueAtPrecision, string> = {
  datetime: "精确时刻",
  day: "某天",
  week: "本周",
  none: "无",
};

/** Tab text: label alone for week/none and for un-selected tabs; "label + value" when active with a value. */
function tabText(precision: DueAtPrecision, dueAt: string | null): string {
  if (precision === "datetime") {
    const v = toDatetimeLocalValue(dueAt).replace("T", " ").replace(/-/g, "/");
    return v || PRECISION_LABEL.datetime;
  }
  if (precision === "day") {
    const v = toDatetimeLocalValue(dueAt).slice(0, 10).replace(/-/g, "/");
    return v || PRECISION_LABEL.day;
  }
  return PRECISION_LABEL[precision];
}

export function InlineDuePicker({
  dueAt,
  precision,
  overdue = false,
  datetimeRef,
  onOpenDatetimePicker,
  onChange,
}: InlineDuePickerProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatetimePicker = () => {
    if (onOpenDatetimePicker) {
      onOpenDatetimePicker();
      return;
    }
    datetimeRef?.current?.showPicker?.();
  };

  const openDatePicker = () => {
    // Defer so the freshly-mounted <input> is in the DOM before showPicker.
    setTimeout(() => dateInputRef.current?.showPicker?.(), 0);
  };

  const switchTo = (next: DueAtPrecision) => {
    // Re-clicking the active tab re-opens the picker when there is one.
    if (next === precision) {
      if (next === "datetime") openDatetimePicker();
      else if (next === "day") openDatePicker();
      return;
    }

    if (next === "none") {
      onChange({ dueAt: null, dueAtPrecision: "none" });
      return;
    }
    if (next === "week") {
      onChange({ dueAt: endOfWeekIso(), dueAtPrecision: "week" });
      return;
    }
    if (next === "day") {
      const base = dueAt ? new Date(dueAt) : new Date();
      onChange({ dueAt: endOfDayIso(base), dueAtPrecision: "day" });
      openDatePicker();
      return;
    }
    // datetime
    const base = dueAt ? new Date(dueAt) : new Date();
    onChange({ dueAt: base.toISOString(), dueAtPrecision: "datetime" });
    openDatetimePicker();
  };

  return (
    <div className="grid grid-cols-4 gap-1">
      {TAB_ORDER.map((p) => {
        const isActive = p === precision;
        const text = isActive ? tabText(p, dueAt) : PRECISION_LABEL[p];
        return (
          <button
            key={p}
            type="button"
            onClick={() => switchTo(p)}
            className={cn(
              "rounded-md border px-1.5 py-1 text-[11px] transition-colors truncate text-center",
              isActive
                ? overdue
                  ? "border-destructive/50 bg-destructive/10 text-destructive font-medium"
                  : "border-primary/50 bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            title={text}
          >
            {text}
          </button>
        );
      })}

      {/* Hidden pickers — kept in the DOM so we can call .showPicker() on them.
          sr-only removes them from layout/visual but keeps them focusable for
          screen readers if ever needed (aria-hidden hides them properly). */}
      {precision === "datetime" && (
        <input
          ref={datetimeRef}
          type="datetime-local"
          value={toDatetimeLocalValue(dueAt)}
          onChange={(e) =>
            onChange({
              dueAt: e.target.value ? new Date(e.target.value).toISOString() : null,
              dueAtPrecision: e.target.value ? "datetime" : "none",
            })
          }
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />
      )}
      {precision === "day" && (
        <input
          ref={dateInputRef}
          type="date"
          value={toDatetimeLocalValue(dueAt).slice(0, 10)}
          onChange={(e) => {
            if (!e.target.value) {
              onChange({ dueAt: null, dueAtPrecision: "none" });
              return;
            }
            const picked = new Date(`${e.target.value}T23:59:00`);
            onChange({ dueAt: picked.toISOString(), dueAtPrecision: "day" });
          }}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />
      )}
    </div>
  );
}
