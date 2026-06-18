import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Todo } from "../lib/types";

const DESKTOP_SIDEBAR_WIDTH = 224;
const MAIN_CONTENT_MIN_WIDTH = 320;
const DETAIL_PANEL_DEFAULT_WIDTH = 820;
const DETAIL_PANEL_MIN_WIDTH = 420;
const DETAIL_PANEL_MAX_WIDTH = 1080;
const DETAIL_PANEL_INITIAL_RATIO = 0.5;
const DETAIL_PANEL_CLOSE_MS = 560;

function getMaxDetailWidth() {
  if (typeof window === "undefined") return DETAIL_PANEL_MAX_WIDTH;
  const availableWidth = window.innerWidth - DESKTOP_SIDEBAR_WIDTH - MAIN_CONTENT_MIN_WIDTH;
  return Math.max(
    DETAIL_PANEL_MIN_WIDTH,
    Math.min(DETAIL_PANEL_MAX_WIDTH, availableWidth)
  );
}

function getInitialDetailWidth() {
  if (typeof window === "undefined") return DETAIL_PANEL_DEFAULT_WIDTH;
  const contentWidth = window.innerWidth - DESKTOP_SIDEBAR_WIDTH;
  return Math.min(
    getMaxDetailWidth(),
    Math.max(DETAIL_PANEL_MIN_WIDTH, Math.floor(contentWidth * DETAIL_PANEL_INITIAL_RATIO))
  );
}

function useDesktopBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 768px)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

interface UseDetailPanelLayoutOptions {
  selectedTodo: Todo | undefined;
  selectedTodoId: string | null;
  setSelectedTodoId: (id: string | null) => void;
}

export function useDetailPanelLayout({
  selectedTodo,
  selectedTodoId,
  setSelectedTodoId,
}: UseDetailPanelLayoutOptions) {
  const isDesktop = useDesktopBreakpoint();
  const [detailWidth, setDetailWidth] = useState(getInitialDetailWidth);
  const [renderedDetailTodo, setRenderedDetailTodo] = useState<Todo | null>(selectedTodo ?? null);
  const [detailPanelRendered, setDetailPanelRendered] = useState(Boolean(selectedTodo));
  const [detailPanelOpen, setDetailPanelOpen] = useState(Boolean(selectedTodo));
  const [isDetailResizing, setIsDetailResizing] = useState(false);

  const previousSelectedTodoId = useRef<string | null>(selectedTodoId);
  const closeDetailTimerRef = useRef<number | null>(null);
  const openDetailFrameRef = useRef<number | null>(null);
  const detailPanelRenderedRef = useRef(detailPanelRendered);
  const detailPanelOpenRef = useRef(detailPanelOpen);

  useEffect(() => {
    detailPanelRenderedRef.current = detailPanelRendered;
  }, [detailPanelRendered]);

  useEffect(() => {
    detailPanelOpenRef.current = detailPanelOpen;
  }, [detailPanelOpen]);

  useEffect(() => {
    const wasDetailOpen = Boolean(previousSelectedTodoId.current);
    const isDetailOpen = Boolean(selectedTodoId);
    previousSelectedTodoId.current = selectedTodoId;

    if (!isDetailOpen || wasDetailOpen || !isDesktop) return;
    setDetailWidth(getInitialDetailWidth());
  }, [selectedTodoId, isDesktop]);

  const clearCloseDetailTimer = useCallback(() => {
    if (!closeDetailTimerRef.current) return;
    window.clearTimeout(closeDetailTimerRef.current);
    closeDetailTimerRef.current = null;
  }, []);

  const clearOpenDetailFrame = useCallback(() => {
    if (!openDetailFrameRef.current) return;
    window.cancelAnimationFrame(openDetailFrameRef.current);
    openDetailFrameRef.current = null;
  }, []);

  const closeDetailPanel = useCallback(() => {
    clearCloseDetailTimer();
    clearOpenDetailFrame();
    setDetailPanelOpen(false);
    closeDetailTimerRef.current = window.setTimeout(() => {
      setSelectedTodoId(null);
      setDetailPanelRendered(false);
      setRenderedDetailTodo(null);
      closeDetailTimerRef.current = null;
    }, DETAIL_PANEL_CLOSE_MS);
  }, [clearCloseDetailTimer, clearOpenDetailFrame, setSelectedTodoId]);

  useEffect(() => () => {
    clearCloseDetailTimer();
    clearOpenDetailFrame();
  }, [clearCloseDetailTimer, clearOpenDetailFrame]);

  useEffect(() => {
    if (!isDesktop) return;

    const syncDetailWidth = () => {
      setDetailWidth((current) =>
        Math.min(getMaxDetailWidth(), Math.max(DETAIL_PANEL_MIN_WIDTH, current))
      );
    };

    syncDetailWidth();
    window.addEventListener("resize", syncDetailWidth);
    return () => window.removeEventListener("resize", syncDetailWidth);
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) {
      clearCloseDetailTimer();
      clearOpenDetailFrame();
      setDetailPanelOpen(false);
      setDetailPanelRendered(false);
      setRenderedDetailTodo(null);
      return;
    }

    if (selectedTodo) {
      clearCloseDetailTimer();
      clearOpenDetailFrame();
      const isSwitchingVisibleTodo = detailPanelRenderedRef.current && detailPanelOpenRef.current;
      setRenderedDetailTodo(selectedTodo);
      setDetailPanelRendered(true);
      if (isSwitchingVisibleTodo) {
        setDetailPanelOpen(true);
        return;
      }

      setDetailPanelOpen(false);
      openDetailFrameRef.current = window.requestAnimationFrame(() => {
        openDetailFrameRef.current = window.requestAnimationFrame(() => {
          setDetailPanelOpen(true);
          openDetailFrameRef.current = null;
        });
      });
      return clearOpenDetailFrame;
    }

    if (closeDetailTimerRef.current) return;

    clearOpenDetailFrame();
    setDetailPanelOpen(false);
    const timeout = window.setTimeout(() => {
      setDetailPanelRendered(false);
      setRenderedDetailTodo(null);
    }, DETAIL_PANEL_CLOSE_MS);

    return () => window.clearTimeout(timeout);
  }, [selectedTodo, isDesktop, clearCloseDetailTimer, clearOpenDetailFrame]);

  const startDetailResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = detailWidth;
    const maxWidth = getMaxDetailWidth();

    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth + startX - moveEvent.clientX;
      setDetailWidth(Math.min(maxWidth, Math.max(DETAIL_PANEL_MIN_WIDTH, nextWidth)));
    };

    const handleUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setIsDetailResizing(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    setIsDetailResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const detailPanelStyle = {
    width: detailPanelOpen ? detailWidth : 0,
    "--detail-panel-width": `${detailWidth}px`,
  } as CSSProperties;

  return {
    isDesktop,
    detailPanelOpen,
    detailPanelRendered,
    detailPanelStyle,
    renderedDetailTodo,
    isDetailResizing,
    closeDetailPanel,
    clearCloseDetailTimer,
    startDetailResize,
  };
}
