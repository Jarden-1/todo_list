// Lightweight popover for composer field buttons. The panel is rendered into
// document.body via a React portal so it escapes any `overflow: hidden`
// ancestor (e.g. the composer's grid collapse container) and can never be
// clipped by the card.
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
}: FieldPopoverProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Recompute the popover's fixed position from the trigger's bounding rect.
  // We re-run on open, on window scroll (capture phase so we catch ancestors
  // that scroll too), and on resize. min-w-[220px] is the default panel
  // width, so we anchor against 220 to keep the panel aligned with the
  // trigger when `align="end"`.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const update = () => {
      const t = triggerRef.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      setPos({
        top: r.bottom + GAP_PX,
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
  }, [open, align]);

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
        pos !== null &&
        createPortal(
          <div
            ref={popoverRef}
            className={cn(
              "fixed z-50 min-w-[220px] rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-xl",
              className,
            )}
            style={{ top: pos.top, left: pos.left }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
