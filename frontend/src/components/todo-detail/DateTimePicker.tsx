// Self-drawn DateTimePicker — replaces the native `<input type="date">` /
// `<input type="datetime-local">` + `.showPicker()` dance that was causing
// the "click tab → land on a plain date grid → click again to add time"
// two-step UX. Two modes share the same calendar grid; the datetime mode
// appends a wheel-style hour/minute picker (1-minute step, no seconds) on
// the right, matching the reference design.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "../../lib/utils";

interface DateTimePickerProps {
  /** "date" → calendar only. "datetime" → calendar + hour/minute wheel. */
  mode: "date" | "datetime";
  /** Current value as an ISO string. When null we fall back to "now" for
   *  display only — no onChange fires until the user actually picks. */
  value: string | null;
  /** Fires with the new ISO (preserves the original time-of-day on date
   *  changes, and the original calendar date on time changes). */
  onChange: (next: { iso: string | null }) => void;
  overdue?: boolean;
}

const WEEK_DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

const WHEEL_ITEM_H = 28;
const WHEEL_VISIBLE = 5; // 5 items visible, middle one highlighted
const WHEEL_PAD = ((WHEEL_VISIBLE - 1) / 2) * WHEEL_ITEM_H;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function formatYearMonth(year: number, month: number) {
  return `${year}年${String(month + 1).padStart(2, "0")}月`;
}

export function DateTimePicker({ mode, value, onChange, overdue = false }: DateTimePickerProps) {
  // Anchor the calendar grid to the value's date, or today if none.
  const anchor = useMemo(() => (value ? parseISO(value) : new Date()), [value]);
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  // When the external value changes (e.g. a different todo loaded, or a
  // precision switch defaulted to today), recentre the grid on it.
  useEffect(() => {
    setViewYear(anchor.getFullYear());
    setViewMonth(anchor.getMonth());
    // We intentionally only react to value changes; the anchor object
    // recomputes every render otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const shiftMonth = (delta: number) => {
    const next = addMonths(new Date(viewYear, viewMonth, 1), delta);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  // 6×7 grid covering the whole month plus the leading/trailing spillover.
  const monthGrid = useMemo(() => {
    const first = startOfMonth(new Date(viewYear, viewMonth, 1));
    const last = endOfMonth(first);
    const start = startOfWeek(first, { weekStartsOn: 0 });
    const end = endOfWeek(last, { weekStartsOn: 0 });
    const cells: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const handleSelectDate = (day: Date) => {
    const next = new Date(day);
    if (mode === "datetime") {
      // Preserve the existing time-of-day if the user already had one; a
      // fresh "no value" state defaults to 00:00 (per spec).
      next.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
    } else {
      next.setHours(0, 0, 0, 0);
    }
    onChange({ iso: next.toISOString() });
  };

  const handleTimeChange = (hour: number, minute: number) => {
    const next = new Date(anchor);
    next.setHours(hour, minute, 0, 0);
    onChange({ iso: next.toISOString() });
  };

  const handleClear = () => onChange({ iso: null });

  const handleToday = () => {
    const today = new Date();
    if (mode === "date") today.setHours(0, 0, 0, 0);
    else {
      // Only seed time-of-day if the user has never picked one. Keeping
      // their existing 00:00 default means "today" just changes the date.
      const hasUserTime = value !== null;
      today.setHours(hasUserTime ? anchor.getHours() : 0, hasUserTime ? anchor.getMinutes() : 0, 0, 0);
    }
    onChange({ iso: today.toISOString() });
  };

  return (
    <div className={cn("space-y-2", overdue && "text-destructive")}>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-medium text-foreground">{formatYearMonth(viewYear, viewMonth)}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="上个月"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="下个月"
          >
            <ChevronUp className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground">
        {WEEK_DAY_LABELS.map((d) => (
          <div key={d} className="h-5 leading-5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {monthGrid.map((day, idx) => {
          const inMonth = isSameMonth(day, new Date(viewYear, viewMonth, 1));
          const selected = isSameDay(day, anchor);
          const today = isSameDay(day, new Date());
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDate(day)}
              className={cn(
                "h-7 rounded text-xs transition-colors",
                !inMonth && "text-muted-foreground/30 hover:text-muted-foreground/60",
                inMonth && !selected && "text-foreground hover:bg-muted/60",
                selected && "bg-primary font-semibold text-primary-foreground shadow-sm",
                !selected && today && inMonth && "ring-1 ring-primary/40 text-primary"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {mode === "datetime" && (
        <div className="grid grid-cols-2 gap-2 pt-1.5">
          <WheelColumn
            values={HOURS}
            value={anchor.getHours()}
            onChange={(h) => handleTimeChange(h, anchor.getMinutes())}
            label="时"
          />
          <WheelColumn
            values={MINUTES}
            value={anchor.getMinutes()}
            onChange={(m) => handleTimeChange(anchor.getHours(), m)}
            label="分"
          />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/40 pt-1.5 text-[11px]">
        <button
          type="button"
          onClick={handleClear}
          className="font-medium text-primary transition-colors hover:text-primary/80"
        >
          清除
        </button>
        <button
          type="button"
          onClick={handleToday}
          className="font-medium text-primary transition-colors hover:text-primary/80"
        >
          今天
        </button>
      </div>
    </div>
  );
}

interface WheelColumnProps {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  label: string;
}

function WheelColumn({ values, value, onChange, label }: WheelColumnProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef(value);
  const programmaticScrollRef = useRef(false);

  // Snap the scroll position to the current value on mount and whenever the
  // controlled `value` changes. We use a flag to ignore the resulting
  // scroll event so we don't echo onChange back at the parent.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    programmaticScrollRef.current = true;
    el.scrollTop = value * WHEEL_ITEM_H;
    lastEmittedRef.current = value;
    // Allow the synthetic scroll event to flush, then re-enable user input.
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, [value]);

  const handleScroll = () => {
    if (programmaticScrollRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / WHEEL_ITEM_H);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    if (clamped !== lastEmittedRef.current) {
      lastEmittedRef.current = clamped;
      onChange(values[clamped]);
    }
  };

  return (
    <div className="relative h-[140px] overflow-hidden rounded-lg border border-border/40 bg-muted/20">
      {/* Highlight band — sits over the middle row, never blocks clicks. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-primary/30 bg-primary/10"
        style={{ height: WHEEL_ITEM_H }}
      />
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="wheel-scroller h-full snap-y snap-mandatory overflow-y-scroll"
      >
        <div style={{ height: WHEEL_PAD }} aria-hidden />
        {values.map((v) => {
          const active = v === value;
          return (
            <div
              key={v}
              className={cn(
                "flex snap-center items-center justify-center text-sm tabular-nums transition-colors",
                active ? "font-semibold text-foreground" : "text-muted-foreground/70"
              )}
              style={{ height: WHEEL_ITEM_H }}
            >
              {String(v).padStart(2, "0")}
              <span className="ml-0.5 text-[9px] text-muted-foreground/50">{label}</span>
            </div>
          );
        })}
        <div style={{ height: WHEEL_PAD }} aria-hidden />
      </div>
    </div>
  );
}
