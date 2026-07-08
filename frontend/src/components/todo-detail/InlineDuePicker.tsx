// InlineDuePicker — compact 4-column due-time editor for the detail panel.
//
// Layout: 1 "main" cell (the currently-selected precision, showing either a
// clickable date/time button or a static label) + 3 "tab" cells (the other
// precisions). This replaces the old "precision row on top, picker below"
// two-row layout with a single row that always fits in one grid cell.
//
// Behaviour:
//   - datetime  → main cell shows "yyyy/MM/dd HH:mm" and opens a datetime-local picker
//   - day       → main cell shows "yyyy/MM/dd" and opens a date picker
//   - week      → main cell shows "本周内截止" (static, not clickable)
//   - none      → main cell shows "未设置截止" (static, not clickable)
//
// Clicking a tab switches precision. Switching TO datetime/day seeds a
// default value (now / today) if none is set so the picker has something
// to show. Switching TO week/none writes the canonical placeholder/null.
import { useRef, type RefObject } from "react";
import { Calendar } from "lucide-react";
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

/** Human-readable main-cell text for each precision. */
function mainCellText(precision: DueAtPrecision, dueAt: string | null): string {
  if (precision === "datetime") {
    const v = toDatetimeLocalValue(dueAt).replace("T", " ").replace(/-/g, "/");
    return v || "点击选择时间";
  }
  if (precision === "day") {
    return toDatetimeLocalValue(dueAt).slice(0, 10).replace(/-/g, "/") || "点击选择日期";
  }
  if (precision === "week") return "本周内截止";
  return "未设置截止";
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

  const switchTo = (next: DueAtPrecision) => {
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

  const openPicker = () => {
    if (precision === "datetime") {
      onOpenDatetimePicker?.();
      return;
    }
    if (precision === "day") {
      dateInputRef.current?.showPicker?.();
    }
  };

  const isMainClickable = precision === "datetime" || precision === "day";

  return (
    <div className="grid grid-cols-4 gap-1">
      {/* Main cell — shows current precision, clickable when it has a real picker */}
      <button
        type="button"
        onClick={isMainClickable ? openPicker : undefined}
        disabled={!isMainClickable}
        className={cn(
          "col-span-1 flex items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[11px] transition-colors truncate",
          overdue
            ? "border-destructive/50 text-destructive"
            : "border-primary/40 bg-primary/10 text-primary font-medium",
          isMainClickable && "cursor-pointer hover:bg-primary/15",
        )}
        title={mainCellText(precision, dueAt)}
      >
        {isMainClickable && <Calendar className="w-3 h-3 flex-shrink-0" />}
        <span className="truncate">{mainCellText(precision, dueAt)}</span>
      </button>

      {/* Tab cells — the other three precisions */}
      {TAB_ORDER.filter((p) => p !== precision).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => switchTo(p)}
          className="col-span-1 rounded-md border border-border px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors truncate"
        >
          {PRECISION_LABEL[p]}
        </button>
      ))}

      {/* Hidden pickers — kept in the DOM so we can call .showPicker() on them.
          The datetime picker is owned by the parent (via datetimeRef) because
          the detail panel manages its visibility; the day picker is local. */}
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
