import { useCallback, useEffect, useRef } from "react";

const SCROLLBAR_VISIBLE_MS = 850;

export function useTransientScrollbar<T extends HTMLElement>() {
  const timeoutRef = useRef<number | null>(null);
  const elementRef = useRef<T | null>(null);

  const setRef = useCallback((node: T | null) => {
    elementRef.current = node;
  }, []);

  const showScrollbar = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    element.classList.add("scrollbar-active");
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      element.classList.remove("scrollbar-active");
      timeoutRef.current = null;
    }, SCROLLBAR_VISIBLE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      elementRef.current?.classList.remove("scrollbar-active");
    };
  }, []);

  return { ref: setRef, refObject: elementRef, onScroll: showScrollbar };
}

export function useAutoHideScrollbars() {
  useEffect(() => {
    const timeouts = new WeakMap<HTMLElement, number>();

    const handleScroll = (event: Event) => {
      const target = event.target;
      const element =
        target instanceof HTMLElement
          ? target
          : document.scrollingElement instanceof HTMLElement
            ? document.scrollingElement
            : document.documentElement;

      element.classList.add("scrollbar-active");
      const currentTimeout = timeouts.get(element);
      if (currentTimeout !== undefined) {
        window.clearTimeout(currentTimeout);
      }

      const nextTimeout = window.setTimeout(() => {
        element.classList.remove("scrollbar-active");
        timeouts.delete(element);
      }, SCROLLBAR_VISIBLE_MS);
      timeouts.set(element, nextTimeout);
    };

    document.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, []);
}
