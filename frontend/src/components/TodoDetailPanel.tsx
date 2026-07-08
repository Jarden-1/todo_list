// SmartTodo - Todo Detail Panel
// Full editing panel: title, status, priority, due date, project, assignee, subtasks, markdown
import { useState, useEffect, useRef, useCallback } from "react";
import { Todo } from "../lib/types";
import { useTodo } from "../contexts/TodoContext";
import { isOverdue } from "../lib/dateUtils";
import { toast } from "sonner";
import { MarkdownEditor } from "./MarkdownEditor";
import { useTransientScrollbar } from "../hooks/useTransientScrollbar";
import { TodoDetailHeader } from "./todo-detail/TodoDetailHeader";
import { TodoDueNotice } from "./todo-detail/TodoDueNotice";
import { TodoSubtasksSection } from "./todo-detail/TodoSubtasksSection";
import { TodoMetadataSection } from "./todo-detail/TodoMetadataSection";
import { TodoTimestamps } from "./todo-detail/TodoTimestamps";
import { polishMarkdown } from "../lib/aiApi";
import { useAuth } from "../contexts/AuthContext";

interface TodoDetailPanelProps {
  todo: Todo;
  onClose: () => void;
}

export function TodoDetailPanel({ todo, onClose }: TodoDetailPanelProps) {
  const {
    updateTodo,
    projects, toggleSubtask, addSubtask, deleteSubtask, setSelectedTodoId,
    refreshWorkspace, syncSubtasksLocally,
  } = useTodo();
  const { user } = useAuth();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(todo.title);
  const [markdownValue, setMarkdownValue] = useState(todo.contentMarkdown);
  const [markdownFullscreen, setMarkdownFullscreen] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [assigneeValue, setAssigneeValue] = useState(todo.assignee ?? "");
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [markdownPolishing, setMarkdownPolishing] = useState(false);
  const dueAtRef = useRef<HTMLInputElement>(null);
  const detailScroll = useTransientScrollbar<HTMLDivElement>();

  // Debounced markdown persistence. Typing only updates local state; the API
  // call is deferred so we don't trigger a todos refresh (which would reset
  // markdownValue mid-typing and break the rich editor caret).
  const markdownTimerRef = useRef<number | null>(null);
  const pendingMarkdownRef = useRef<string | null>(null);
  const todoIdRef = useRef(todo.id);
  todoIdRef.current = todo.id;

  const flushMarkdown = useCallback(() => {
    if (markdownTimerRef.current) {
      window.clearTimeout(markdownTimerRef.current);
      markdownTimerRef.current = null;
    }
    const pending = pendingMarkdownRef.current;
    if (pending === null) return;
    const targetId = todoIdRef.current;
    pendingMarkdownRef.current = null;
    void updateTodo(targetId, { contentMarkdown: pending }).catch(() => {
      toast.error("正文保存失败，请稍后刷新确认");
    });
  }, [updateTodo]);

  useEffect(() => {
    setTitleValue(todo.title);
    setAssigneeValue(todo.assignee ?? "");
    setMarkdownFullscreen(false);
    setNewSubtask("");
    setShowSubtaskInput(false);
  }, [todo.id, todo.title, todo.assignee]);

  // When the selected todo changes, flush any pending edit for the previous
  // todo, then load the new todo's content.
  useEffect(() => {
    flushMarkdown();
    pendingMarkdownRef.current = null;
    setMarkdownValue(todo.contentMarkdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todo.id]);

  // Sync external content changes ONLY when there is no local pending edit
  // (e.g. AI polish from the server, or another client). Local typing keeps
  // ownership until it is flushed.
  useEffect(() => {
    if (pendingMarkdownRef.current !== null) return;
    setMarkdownValue(todo.contentMarkdown);
  }, [todo.contentMarkdown]);

  // Flush pending markdown when the panel unmounts.
  useEffect(() => {
    return () => {
      flushMarkdown();
    };
  }, [flushMarkdown]);

  const handleTitleSave = async () => {
    if (titleValue.trim()) {
      try {
        await updateTodo(todo.id, { title: titleValue.trim() });
      } catch (error) {
        setTitleValue(todo.title);
        toast.error(error instanceof Error ? error.message : "标题保存失败");
      }
    }
    setEditingTitle(false);
  };

  const handleMarkdownChange = (nextMarkdown: string) => {
    setMarkdownValue(nextMarkdown);
    pendingMarkdownRef.current = nextMarkdown;
    if (markdownTimerRef.current) window.clearTimeout(markdownTimerRef.current);
    markdownTimerRef.current = window.setTimeout(() => {
      markdownTimerRef.current = null;
      flushMarkdown();
    }, 800);

    // Optimistically sync subtasks from `- [ ]` / `- [x]` lines so the bottom
    // subtask list updates immediately, without waiting for the 800ms debounced
    // contentMarkdown save (which triggers the backend's own subtask sync via
    // replaceActiveSubtasksFromMarkdown). The backend remains the source of
    // truth — its response will reconcile any drift on the next refresh.
    syncSubtasksLocally(todo.id, nextMarkdown);
  };

  const handleMarkdownPolish = async () => {
    setMarkdownPolishing(true);
    try {
      const timezone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { markdown } = await polishMarkdown(markdownValue, timezone);
      if (!markdown) return;
      if (markdownTimerRef.current) {
        window.clearTimeout(markdownTimerRef.current);
        markdownTimerRef.current = null;
      }
      pendingMarkdownRef.current = null;
      setMarkdownValue(markdown);
      await updateTodo(todo.id, { contentMarkdown: markdown });
      toast.success("AI 已润色正文");
    } catch (error) {
      toast.error(error instanceof Error ? `AI 润色失败：${error.message}` : "AI 润色失败");
    } finally {
      setMarkdownPolishing(false);
    }
  };

  const handleAssigneeSave = async () => {
    try {
      await updateTodo(todo.id, { assignee: assigneeValue.trim() || undefined });
    } catch (error) {
      setAssigneeValue(todo.assignee ?? "");
      toast.error(error instanceof Error ? error.message : "对接人保存失败");
    }
    setEditingAssignee(false);
  };

  const handleAddSubtask = async () => {
    if (newSubtask.trim()) {
      try {
        await addSubtask(todo.id, newSubtask.trim());
        setNewSubtask("");
        setShowSubtaskInput(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "子任务添加失败");
      }
    }
  };

  const handlePostpone = async (days: number) => {
    const base = todo.dueAt ? new Date(todo.dueAt) : new Date();
    const newDate = new Date(base);
    newDate.setDate(newDate.getDate() + days);
    // Quick-postpone is a day-level action (明天/下周/两周后). Keep the original
    // precision when it was exact; otherwise treat it as day precision (23:59
    // placeholder) so dueAt and dueAtPrecision stay consistent.
    const keepExact = (todo.dueAtPrecision ?? "datetime") === "datetime";
    if (keepExact) {
      newDate.setHours(base.getHours(), base.getMinutes(), 0, 0);
    } else {
      newDate.setHours(23, 59, 0, 0);
    }
    try {
      await updateTodo(todo.id, {
        dueAt: newDate.toISOString(),
        dueAtPrecision: keepExact ? "datetime" : "day",
      });
      toast.success(`已延期至 ${newDate.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "延期失败");
    }
  };

  const overdue = isOverdue(todo.dueAt) && todo.status !== "done" && todo.status !== "cancelled";
  const openDuePicker = () => {
    const input = dueAtRef.current;
    if (!input) return;
    input.focus();
    input.showPicker?.();
  };

  const openMarkdownFullscreen = () => {
    setMarkdownFullscreen(true);
  };

  return (
    <div className="h-full w-full min-w-0 flex flex-col bg-card">
      <TodoDetailHeader
        todo={todo}
        editingTitle={editingTitle}
        titleValue={titleValue}
        onTitleChange={setTitleValue}
        onStartTitleEdit={() => setEditingTitle(true)}
        onSaveTitle={handleTitleSave}
        onCancelTitle={() => {
          setTitleValue(todo.title);
          setEditingTitle(false);
        }}
        onClose={onClose}
        onDeleted={onClose}
        onRestored={() => setSelectedTodoId(todo.id)}
        onDuplicated={(duplicatedTodo) => setSelectedTodoId(duplicatedTodo.id)}
      />

      {/* Scrollable content */}
      <div
        ref={detailScroll.ref}
        onScroll={detailScroll.onScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5"
      >
        <TodoDueNotice todo={todo} />

        {/* Markdown content */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="detail-label">正文</label>
          </div>
          <MarkdownEditor
            value={markdownValue}
            onChange={handleMarkdownChange}
            todoId={todo.id}
            placeholder="点击添加正文内容，支持 Markdown、图片和快捷键…"
            rows={8}
            rich
            toolbarMode="responsive"
            onAiOrganize={handleMarkdownPolish}
            aiLoading={markdownPolishing}
            aiDisabled={!markdownValue.trim()}
            aiLabel="AI 润色"
            showFullscreenToggle
            onToggleFullscreen={openMarkdownFullscreen}
            fullscreenToggleLabel="全屏编辑"
            resizableY
            defaultHeight={230}
            minHeight={150}
            maxHeight={520}
            className="overflow-hidden rounded-xl bg-muted/35 ring-1 ring-border/30 transition focus-within:bg-card focus-within:ring-primary/35 focus-within:shadow-[0_0_0_3px_oklch(from_var(--primary)_l_c_h_/_10%)]"
            toolbarClassName="markdown-toolbar-embedded px-3 py-2"
            textareaClassName="px-3 pb-5 pt-2 text-xs leading-relaxed"
          />
        </div>

        <TodoSubtasksSection
          todo={todo}
          newSubtask={newSubtask}
          showSubtaskInput={showSubtaskInput}
          onNewSubtaskChange={setNewSubtask}
          onShowSubtaskInputChange={setShowSubtaskInput}
          onAddSubtask={handleAddSubtask}
          onToggleSubtask={(subtaskId) => {
            void toggleSubtask(todo.id, subtaskId).catch((error) => {
              toast.error(error instanceof Error ? error.message : "子任务更新失败");
              void refreshWorkspace().catch(() => {});
            });
          }}
          onDeleteSubtask={(subtaskId) => {
            void deleteSubtask(todo.id, subtaskId).catch((error) => {
              toast.error(error instanceof Error ? error.message : "子任务删除失败");
            });
          }}
        />

        <TodoMetadataSection
          todo={todo}
          projects={projects}
          assigneeValue={assigneeValue}
          editingAssignee={editingAssignee}
          dueAtRef={dueAtRef}
          overdue={overdue}
          onUpdate={(updates) => {
            void updateTodo(todo.id, updates).catch((error) => {
              toast.error(error instanceof Error ? error.message : "待办保存失败");
            });
          }}
          onAssigneeValueChange={setAssigneeValue}
          onEditingAssigneeChange={setEditingAssignee}
          onAssigneeSave={handleAssigneeSave}
          onOpenDuePicker={openDuePicker}
          onPostpone={handlePostpone}
        />

        <TodoTimestamps todo={todo} />
      </div>

      {markdownFullscreen && (
        <div
          className="fixed inset-0 z-[90] bg-background/95 p-3 backdrop-blur-sm md:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMarkdownFullscreen(false);
          }}
        >
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
            <MarkdownEditor
              value={markdownValue}
              onChange={handleMarkdownChange}
              todoId={todo.id}
              placeholder="支持 Markdown 格式…"
              rows={18}
              autoFocus
              fullscreen
              onAiOrganize={handleMarkdownPolish}
              aiLoading={markdownPolishing}
              aiDisabled={!markdownValue.trim()}
              aiLabel="AI 润色"
              showFullscreenToggle
              onToggleFullscreen={() => setMarkdownFullscreen(false)}
              fullscreenToggleLabel="退出全屏"
              toolbarClassName="border-b border-border/45 px-3 py-2 md:px-4"
              textareaClassName="px-4 py-4 text-sm leading-relaxed md:px-5 md:py-5 md:text-base"
            />
          </div>
        </div>
      )}
    </div>
  );
}
