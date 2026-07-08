import type { DueAtPrecision } from "../../lib/types";
import { DUE_PRECISION_OPTIONS } from "../../lib/todoOptions";
import { endOfDayIso, endOfWeekIso } from "../../lib/dateUtils";
import { cn } from "../../lib/utils";
import { DateTimePicker } from "./DateTimePicker";

interface DuePrecisionPickerProps {
  /** Current resolved dueAt ISO string (placeholder for day/week), or null. */
  dueAt: string | null;
  precision: DueAtPrecision;
  /** Emits the new dueAt + precision together so they never drift apart. */
  onChange: (next: { dueAt: string | null; dueAtPrecision: DueAtPrecision }) => void;
  overdue?: boolean;
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
        {DUE_PRECISION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePrecisionChange(option.value)}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] transition-colors",
              precision === option.value
                ? "border-primary/50 bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {precision === "datetime" && (
        <div className="mt-1.5">
          <DateTimePicker
            mode="datetime"
            value={dueAt}
            overdue={overdue}
            onChange={(next) =>
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
            onChange={(next) =>
              onChange({
                dueAt: next.iso,
                dueAtPrecision: next.iso ? "day" : "none",
              })
            }
          />
        </div>
      )}

      {precision === "week" && (
        <p className="mt-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
          本周内截止（周一至周日）
        </p>
      )}

      {precision === "none" && (
        <p className="mt-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
          未设置截止时间
        </p>
      )}
    </>
  );
}
