import type { DueAtPrecision } from "../../lib/types";
import { DUE_PRECISION_OPTIONS } from "../../lib/todoOptions";
import { endOfDayIso, endOfWeekIso } from "../../lib/dateUtils";
import { toDatetimeLocalValue } from "../../lib/todoDueReminder";
import { cn } from "../../lib/utils";

interface DuePrecisionPickerProps {
  /** Current resolved dueAt ISO string (placeholder for day/week), or null. */
  dueAt: string | null;
  precision: DueAtPrecision;
  /** Emits the new dueAt + precision together so they never drift apart. */
  onChange: (next: { dueAt: string | null; dueAtPrecision: DueAtPrecision }) => void;
  overdue?: boolean;
  /** Optional ref + click handler for the datetime-local input (detail panel uses it). */
  datetimeRef?: React.RefObject<HTMLInputElement | null>;
  onOpenDatetimePicker?: () => void;
}

/**
 * Shared due-time editor with precision tabs (精确时刻 / 某天 / 本周内 / 无).
 * Used by both the structured composer form and the detail metadata section so
 * the precision logic lives in exactly one place — keeping dueAt and
 * dueAtPrecision consistent everywhere.
 *
 * For day/week precision the dueAt is stored as a resolved ISO placeholder
 * (23:59 of the day / Sunday) so sorting and overdue detection keep working,
 * while the UI hides the time.
 */
export function DuePrecisionPicker({
  dueAt,
  precision,
  onChange,
  overdue = false,
  datetimeRef,
  onOpenDatetimePicker,
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
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenDatetimePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenDatetimePicker?.();
            }
          }}
          className="mt-1.5"
        >
          <input
            ref={datetimeRef}
            type="datetime-local"
            value={toDatetimeLocalValue(dueAt)}
            onChange={(event) =>
              onChange({
                dueAt: event.target.value ? new Date(event.target.value).toISOString() : null,
                dueAtPrecision: event.target.value ? "datetime" : "none",
              })
            }
            className={cn(
              "field-input cursor-pointer",
              overdue && "border-destructive/50 text-destructive"
            )}
          />
        </div>
      )}

      {precision === "day" && (
        <input
          type="date"
          value={toDatetimeLocalValue(dueAt).slice(0, 10)}
          onChange={(event) => {
            if (!event.target.value) {
              onChange({ dueAt: null, dueAtPrecision: "none" });
              return;
            }
            const picked = new Date(`${event.target.value}T23:59:00`);
            onChange({ dueAt: picked.toISOString(), dueAtPrecision: "day" });
          }}
          className={cn(
            "field-input mt-1.5 cursor-pointer",
            overdue && "border-destructive/50 text-destructive"
          )}
        />
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
