// Lightweight popover for composer field buttons. Avoids pulling in a full
// floating-ui / radix dependency — the composer buttons only need a simple
// "click to open, click outside / Esc to close" panel anchored below the
// trigger.
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface FieldPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}

export function FieldPopover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "start",
  className,
}: FieldPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
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
  }, [open, onOpenChange]);

  return (
    <div ref={containerRef} className="relative">
      {trigger}
      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1.5 min-w-[220px] rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-xl",
            align === "end" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
