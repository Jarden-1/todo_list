import { useState, type RefObject } from "react";
import type { DueAtPrecision } from "../../lib/types";
import { DUE_PRECISION_OPTIONS } from "../../lib/todoOptions";
import { endOfDayIso, endOfWeekIso } from "../../lib/dateUtils";
import { toDatetimeLocalValue } from "../../lib/todoDueReminder";
import { cn } from "../../lib/utils";
import { DateTimePicker } from "./DateTimePicker";
import { FieldPopover } from "../composer/FieldPopover";

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
  /**
   * Fires AFTER the user clicks "确定" in the embedded DateTimePicker
   * (i.e. only on the commit path, never on a tab switch). Lets the
   * composer close its popover on confirm without confusing tab switches
   * with explicit commits.
   */
  onAfterConfirm?: () => void;
  /**
   * When `showValueInActiveTab` is true, the date/time picker is hidden
   * by default and opens in a popover only when the user clicks the
   * "精确时刻" or "某天" tab. Defaults to true on the detail panel.
   * The composer popover keeps it false so the picker stays inline.
   */
  popoverOnTabClick?: boolean;
  /** Owner container used by FieldPopover to decide what's "inside". */
  containerRef?: RefObject<HTMLElement | null>;
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
  onAfterConfirm,
  popoverOnTabClick = false,
  containerRef,
}: DuePrecisionPickerProps) {
  // Detail panel: the picker is hidden by default. Clicking datetime/day
  // opens a popover; clicking the same tab again reopens it. week/none
  // never open the popover (no concrete value to pick).
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePrecisionChange = (next: DueAtPrecision) => {
    if (next === precision) {
      // Re-clicking the active tab re-opens the picker (datetime/day only).
      if (popoverOnTabClick && (next === "datetime" || next === "day")) {
        setPickerOpen((open) => !open);
      }
      return;
    }
    if (next === "none") {
      onChange({ dueAt: null, dueAtPrecision: "none" });
      setPickerOpen(false);
      return;
    }
    if (next === "week") {
      onChange({ dueAt: endOfWeekIso(), dueAtPrecision: "week" });
      setPickerOpen(false);
      return;
    }
    if (next === "day") {
      const base = dueAt ? new Date(dueAt) : new Date();
      onChange({ dueAt: endOfDayIso(base), dueAtPrecision: "day" });
      if (popoverOnTabClick) setPickerOpen(true);
      return;
    }
    // datetime
    const base = dueAt ? new Date(dueAt) : new Date();
    onChange({ dueAt: base.toISOString(), dueAtPrecision: "datetime" });
    if (popoverOnTabClick) setPickerOpen(true);
  };

  // The 4 precision tabs — shared by both layouts. In popover mode the
  // tabs double as the popover trigger: clicking inside a tab does NOT
  // close the popover (FieldPopover detects target inside trigger).
  const tabs = (
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
                ? overdue
                  ? "border-destructive/50 bg-destructive/10 text-destructive font-medium"
                  : "border-primary/50 bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {valueText ? `${option.label} ${valueText}` : option.label}
          </button>
        );
      })}
    </div>
  );

  // The picker body — datetime/day modes render the same DateTimePicker
  // with the current precision implied by the active tab.
  const pickerBody = (precision === "datetime" || precision === "day") && (
    <DateTimePicker
      mode={precision === "datetime" ? "datetime" : "date"}
      value={dueAt}
      overdue={overdue}
      onConfirm={(next) => {
        onChange({
          dueAt: next.iso,
          dueAtPrecision: next.iso ? precision : "none",
        });
        onAfterConfirm?.();
        setPickerOpen(false);
      }}
    />
  );

  // Popover layout (detail panel): tabs are the trigger, picker rides in
  // the popover body. Composer popover layout: tabs + picker both live
  // inline (the outer FieldPopover already handles the floating layer).
  //
  // The date-only picker is short enough that flipping above the tabs
  // would feel disconnected — pin it below even at the viewport bottom.
  // The datetime picker is tall (calendar + hour/minute wheel) and flips
  // when the trigger is too close to the bottom edge.
  if (popoverOnTabClick) {
    return (
      <FieldPopover
        open={pickerOpen && (precision === "datetime" || precision === "day")}
        onOpenChange={setPickerOpen}
        containerRef={containerRef}
        className="min-w-[320px]"
        placement={precision === "datetime" ? "auto" : "below"}
        trigger={tabs}
      >
        {pickerBody}
      </FieldPopover>
    );
  }

  return (
    <>
      {tabs}

      {precision === "datetime" && (
        <div className="mt-1.5">
          <DateTimePicker
            mode="datetime"
            value={dueAt}
            overdue={overdue}
            onConfirm={(next) => {
              onChange({
                dueAt: next.iso,
                dueAtPrecision: next.iso ? "datetime" : "none",
              });
              onAfterConfirm?.();
            }}
          />
        </div>
      )}

      {precision === "day" && (
        <div className="mt-1.5">
          <DateTimePicker
            mode="date"
            value={dueAt}
            overdue={overdue}
            onConfirm={(next) => {
              onChange({
                dueAt: next.iso,
                dueAtPrecision: next.iso ? "day" : "none",
              });
              onAfterConfirm?.();
            }}
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
