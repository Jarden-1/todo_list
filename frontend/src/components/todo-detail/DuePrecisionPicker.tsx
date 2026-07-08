import type { DueAtPrecision } from "../../lib/types";
import { DUE_PRECISION_OPTIONS } from "../../lib/todoOptions";
import { endOfDayIso, endOfWeekIso } from "../../lib/dateUtils";
import { toDatetimeLocalValue } from "../../lib/todoDueReminder";
import { cn } from "../../lib/utils";
import { DateTimePicker } from "./DateTimePicker";

interface DuePrecisionPickerProps {
  /** Current resolved dueAt ISO string (placeholder for day/week), or null. */
  dueAt: string | null;
  precision: DueAtPrecision;
  /** Emits the new dueAt + precision together so they never drift apart. */
  onChange: (next: { dueAt: string | null; dueAtPrecision: DueAtPrecision }) => void;
  overdue?: boolean;
  /**
   * When true, the active tab's label is followed by its current value
   * (e.g. "精确时刻 07/08 22:39"). Used by the detail panel's compact
   * layout so the user can see the value without a separate summary row.
   * The composer popover leaves this false (label-only tabs) to stay
   * compact inside the floating panel.
   */
  showValueInActiveTab?: boolean;
}

/**
 * Shared due-time editor with precision tabs (精确时刻 / 某天 / 本周内 / 无).
 * Used by both the structured composer form and the detail metadata section so
 * the precision logic lives in exactly one place — keeping dueAt and
 * dueAtPrecision consistent everywhere.
 *
 * The actual date/time UI is the self-drawn DateTimePicker (no native
 * `<input type="date">` + `.showPicker()` dance). Switching to "精确时刻"
 * lands directly on the calendar + hour/minute wheel in a single step; no
 * intermediate "click again to add a time" modal.
 */
export function DuePrecisionPicker({
  dueAt,
  precision,
  onChange,
  overdue = false,
  showValueInActiveTab = false,
}: DuePrecisionPickerProps) {
  const handlePrecisionChange = (next: DueAtPrecision) => {
    if (next === precision) return;
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
      return;
    }
    // datetime
    const base = dueAt ? new Date(dueAt) : new Date();
    onChange({ dueAt: base.toISOString(), dueAtPrecision: "datetime" });
  };

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {DUE_PRECISION_OPTIONS.map((option) => {
          const isActive = precision === option.value;
          const valueText =
            isActive && showValueInActiveTab
              ? tabValueText(option.value, dueAt)
              : null;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePrecisionChange(option.value)}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] transition-colors",
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {valueText ? `${option.label} ${valueText}` : option.label}
            </button>
          );
        })}
      </div>

      {precision === "datetime" && (
        <div className="mt-1.5">
          <DateTimePicker
            mode="datetime"
            value={dueAt}
            overdue={overdue}
            onConfirm={(next) =>
              onChange({
                dueAt: next.iso,
                dueAtPrecision: next.iso ? "datetime" : "none",
              })
            }
          />
        </div>
      )}

      {precision === "day" && (
        <div className="mt-1.5">
          <DateTimePicker
            mode="date"
            value={dueAt}
            overdue={overdue}
            onConfirm={(next) =>
              onChange({
                dueAt: next.iso,
                dueAtPrecision: next.iso ? "day" : "none",
              })
            }
          />
        </div>
      )}

      {/* week / none have no picker — the tab label already tells the story.
          The composer popover keeps the old hint paragraphs for context; the
          detail panel uses showValueInActiveTab and drops them. */}
      {!showValueInActiveTab && precision === "week" && (
        <p className="mt-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
          本周内截止（周一至周日）
        </p>
      )}

      {!showValueInActiveTab && precision === "none" && (
        <p className="mt-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
          未设置截止时间
        </p>
      )}
    </>
  );
}

/** Returns a short value string for the active tab, or null if the
 *  precision has no value concept (week / none) or no value is set. */
function tabValueText(precision: DueAtPrecision, dueAt: string | null): string | null {
  if (!dueAt) return null;
  if (precision === "week" || precision === "none") return null;
  const local = toDatetimeLocalValue(dueAt); // "YYYY-MM-DDTHH:mm"
  if (!local) return null;
  if (precision === "day") return local.slice(0, 10).replace(/-/g, "/");
  // datetime — "MM/DD HH:mm"
  const [date, time] = local.split("T");
  return `${date.slice(5).replace(/-/g, "/")} ${time}`;
}
