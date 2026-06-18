import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

interface UseResizableHeightOptions {
  enabled: boolean;
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
}

function clampHeight(height: number, minHeight: number, maxHeight: number) {
  return Math.min(maxHeight, Math.max(minHeight, height));
}

export function useResizableHeight({
  enabled,
  defaultHeight,
  minHeight,
  maxHeight,
}: UseResizableHeightOptions) {
  const [height, setHeight] = useState(defaultHeight);
  const previousCursorRef = useRef("");
  const previousUserSelectRef = useRef("");
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const clampedHeight = clampHeight(height, minHeight, maxHeight);

  const restoreDocumentDragStyles = useCallback(() => {
    document.body.style.cursor = previousCursorRef.current;
    document.body.style.userSelect = previousUserSelectRef.current;
  }, []);

  const cleanupActiveDrag = useCallback(() => {
    cleanupDragRef.current?.();
    cleanupDragRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setHeight((current) => clampHeight(current, minHeight, maxHeight));
  }, [enabled, minHeight, maxHeight]);

  useEffect(() => () => cleanupActiveDrag(), [cleanupActiveDrag]);

  const style = useMemo<CSSProperties | undefined>(() => {
    if (!enabled) return undefined;
    return { height: clampedHeight, minHeight, maxHeight };
  }, [clampedHeight, enabled, maxHeight, minHeight]);

  const startResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    event.preventDefault();
    event.stopPropagation();
    cleanupActiveDrag();

    const startY = event.clientY;
    const startHeight = clampedHeight;

    previousCursorRef.current = document.body.style.cursor;
    previousUserSelectRef.current = document.body.style.userSelect;

    const handleMove = (moveEvent: PointerEvent) => {
      const nextHeight = startHeight + moveEvent.clientY - startY;
      setHeight(clampHeight(nextHeight, minHeight, maxHeight));
    };

    const handleUp = () => {
      restoreDocumentDragStyles();
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      cleanupDragRef.current = null;
    };

    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    cleanupDragRef.current = () => {
      restoreDocumentDragStyles();
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [
    clampedHeight,
    cleanupActiveDrag,
    enabled,
    maxHeight,
    minHeight,
    restoreDocumentDragStyles,
  ]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const step = event.shiftKey ? 40 : 16;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setHeight((current) =>
        clampHeight(current + (event.key === "ArrowDown" ? step : -step), minHeight, maxHeight)
      );
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setHeight(event.key === "Home" ? minHeight : maxHeight);
    }
  }, [enabled, maxHeight, minHeight]);

  return {
    style,
    startResize,
    handleKeyDown,
  };
}
