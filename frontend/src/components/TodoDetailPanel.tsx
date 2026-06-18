// SmartTodo - Todo Detail Panel
// Full editing panel: title, status, priority, due date, project, assignee, subtasks, markdown
import { useState, useEffect, useRef } from "react";
import { Todo } from "../lib/types";
import { useTodo } from "../contexts/TodoContext";
import { isOverdue } from "../lib/dateUtils";
import { toast } from "sonner";
import { MarkdownEditor } from "./MarkdownEditor";
import { useAiPolishMarkdown } from "../hooks/useAiPolishMarkdown";
import { useTransientScrollbar } from "../hooks/useTransientScrollbar";
import { TodoDetailHeader } from "./todo-detail/TodoDetailHeader";
import { TodoDueNotice } from "./todo-detail/TodoDueNotice";
import { TodoSubtasksSection } from "./todo-detail/TodoSubtasksSection";
import { TodoMetadataSection } from "./todo-detail/TodoMetadataSection";
import { TodoTimestamps } from "./todo-detail/TodoTimestamps";

interface TodoDetailPanelProps {
  todo: Todo;
  onClose: () => void;
}

export function TodoDetailPanel({ todo, onClose }: TodoDetailPanelProps) {
  const {
    updateTodo,
    projects, toggleSubtask, addSubtask, deleteSubtask, setSelectedTodoId,
  } = useTodo();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(todo.title);
  const [markdownValue, setMarkdownValue] = useState(todo.contentMarkdown);
  const [markdownFullscreen, setMarkdownFullscreen] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [assigneeValue, setAssigneeValue] = useState(todo.assignee ?? "");
  const [editingAssignee, setEditingAssignee] = useState(false);
  const dueAtRef = useRef<HTMLInputElement>(null);
  const detailScroll = useTransientScrollbar<HTMLDivElement>();
  const { polish: polishMarkdown, loading: markdownPolishing } = useAiPolishMarkdown({
    onError: (error) => toast.error(`AI 润色失败：${error}`),
  });

  useEffect(() => {
    setTitleValue(todo.title);
    setAssigneeValue(todo.assignee ?? "");
    setMarkdownFullscreen(false);
    setNewSubtask("");
    setShowSubtaskInput(false);
  }, [todo.id, todo.title, todo.assignee]);

  useEffect(() => {
    setMarkdownValue(todo.contentMarkdown);
  }, [todo.id, todo.contentMarkdown]);

  const handleTitleSave = () => {
    if (titleValue.trim()) updateTodo(todo.id, { title: titleValue.trim() });
    setEditingTitle(false);
  };

  const handleMarkdownChange = (nextMarkdown: string) => {
    setMarkdownValue(nextMarkdown);
    updateTodo(todo.id, { contentMarkdown: nextMarkdown });
  };

  const handleMarkdownPolish = async () => {
    const polished = await polishMarkdown(markdownValue);
    if (!polished) return;
    setMarkdownValue(polished);
    updateTodo(todo.id, { contentMarkdown: polished });
    toast.success("AI 已润色正文");
  };

  const handleAssigneeSave = () => {
    updateTodo(todo.id, { assignee: assigneeValue.trim() || undefined });
    setEditingAssignee(false);
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      addSubtask(todo.id, newSubtask.trim());
      setNewSubtask("");
      setShowSubtaskInput(false);
    }
  };

  const handlePostpone = (days: number) => {
    const base = todo.dueAt ? new Date(todo.dueAt) : new Date();
    const newDate = new Date(base);
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(18, 0, 0, 0);
    updateTodo(todo.id, { dueAt: newDate.toISOString() });
    toast.success(`已延期至 ${newDate.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}`);
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
          onToggleSubtask={(subtaskId) => toggleSubtask(todo.id, subtaskId)}
          onDeleteSubtask={(subtaskId) => deleteSubtask(todo.id, subtaskId)}
        />

        <TodoMetadataSection
          todo={todo}
          projects={projects}
          assigneeValue={assigneeValue}
          editingAssignee={editingAssignee}
          dueAtRef={dueAtRef}
          overdue={overdue}
          onUpdate={(updates) => updateTodo(todo.id, updates)}
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
