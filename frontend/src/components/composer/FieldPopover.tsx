// Lightweight popover for composer field buttons. The panel is rendered into
// document.body via a React portal so it escapes any `overflow: hidden`
// ancestor (e.g. the composer's grid collapse container) and can never be
// clipped by the card.
//
// **Flip behaviour**: the popover is placed BELOW the trigger by default;
// if there isn't enough room below the trigger for the popover's measured
// height, it flips above. If neither side fits (the content is taller than
// the viewport itself), we pin it to the viewport top with a small margin.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

interface FieldPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  /**
   * Optional "owner" container. When the user clicks anywhere inside this
   * ref, the popover does NOT close — we treat that as the user just
   * refocusing the composer (e.g. clicking the textarea to keep writing)
   * rather than explicitly dismissing the popover. ESC, clicking the
   * trigger again, or clicking outside the owner container all still close.
   */
  containerRef?: RefObject<HTMLElement | null>;
  /**
   * Placement hint. `"auto"` (default) flips above the trigger when there
   * isn't enough room below — useful for tall popovers like the datetime
   * picker. `"below"` always places the popover below the trigger, even
   * if it gets clipped at the viewport bottom; the date-only picker uses
   * this since its small height rarely needs a flip and flipping up
   * would make the popover feel disconnected from the trigger it
   * belongs to.
   */
  placement?: "auto" | "below";
}

const GAP_PX = 6; // matches Tailwind's mt-1.5 on the panel

export function FieldPopover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "start",
  className,
  containerRef,
  placement = "auto",
}: FieldPopoverProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position the popover based on the trigger's rect and the popover's
  // measured height. The popover is always mounted when `open` (visibility
  // toggled via the `invisible` class) so `popoverRef.current.offsetHeight`
  // is reliable on the first measurement pass.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const update = () => {
      const t = triggerRef.current;
      const p = popoverRef.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const popoverHeight = p?.offsetHeight ?? 0;
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - r.bottom - GAP_PX;
      const spaceAbove = r.top - GAP_PX;
      const fitsBelow = popoverHeight === 0 || spaceBelow >= popoverHeight;
      const fitsAbove = popoverHeight > 0 && spaceAbove >= popoverHeight;
      let top: number;
      if (
        placement === "auto" &&
        !fitsBelow &&
        spaceAbove > spaceBelow &&
        fitsAbove
      ) {
        // Flip above the trigger (only in auto mode — `"below"` always
        // anchors below even if clipped, to stay visually attached to the
        // trigger it belongs to).
        top = Math.max(GAP_PX, r.top - GAP_PX - popoverHeight);
      } else if (
        placement === "auto" &&
        !fitsBelow &&
        !fitsAbove
      ) {
        // Content is taller than the viewport itself — pin to the top
        // with a small margin so the user can at least see the header.
        top = GAP_PX;
      } else {
        // Default: below the trigger
        top = r.bottom + GAP_PX;
      }
      setPos({
        top,
        left: align === "end" ? r.right - 220 : r.left,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, align, placement]);

  // Outside-click + Escape to close. The popover is now in a portal, so we
  // must check both the trigger wrapper and the popover element when
  // deciding whether the click was "inside". Clicks inside the optional
  // owner `containerRef` are also treated as "inside" so the user can move
  // focus back to the composer textarea without dismissing the popover.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      if (containerRef?.current?.contains(target)) return;
      onOpenChange(false);
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [open, onOpenChange, containerRef]);

  return (
    <>
      <div ref={triggerRef} className="relative inline-block">
        {trigger}
      </div>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className={cn(
              "fixed z-50 min-w-[220px] rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-xl",
              pos === null && "invisible",
              className,
            )}
            style={pos ?? { top: 0, left: 0 }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

