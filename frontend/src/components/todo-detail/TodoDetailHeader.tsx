import { Check, CheckCircle2, Edit3, PanelRightClose } from "lucide-react";
import type { Todo } from "../../lib/types";
import { TodoActionsMenu } from "../TodoActionsMenu";

interface TodoDetailHeaderProps {
  todo: Todo;
  editingTitle: boolean;
  titleValue: string;
  onTitleChange: (value: string) => void;
  onStartTitleEdit: () => void;
  onSaveTitle: () => void;
  onCancelTitle: () => void;
  onClose: () => void;
  onDeleted: () => void;
  onRestored: () => void;
  onDuplicated: (todo: Todo) => void;
}

export function TodoDetailHeader({
  todo,
  editingTitle,
  titleValue,
  onTitleChange,
  onStartTitleEdit,
  onSaveTitle,
  onCancelTitle,
  onClose,
  onDeleted,
  onRestored,
  onDuplicated,
}: TodoDetailHeaderProps) {
  return (
    <div className="detail-panel-header relative flex h-16 items-center justify-between px-5">
      <button
        type="button"
        onClick={onClose}
        className="z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/65 transition-colors hover:bg-muted hover:text-foreground"
        aria-label="收起详情面板"
        title="收起详情面板"
      >
        <PanelRightClose className="h-4 w-4" />
      </button>

      <div className="absolute left-1/2 top-1/2 w-[min(34rem,calc(100%-16rem))] -translate-x-1/2 -translate-y-1/2">
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={titleValue}
              onChange={(event) => onTitleChange(event.target.value)}
              onBlur={onSaveTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSaveTitle();
                if (event.key === "Escape") onCancelTitle();
              }}
              className="field-input text-center text-sm font-semibold"
            />
            <button onClick={onSaveTitle} className="p-1.5 text-emerald-500 hover:text-emerald-400">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartTitleEdit}
            className="group mx-auto flex max-w-full items-center justify-center gap-2 rounded-lg px-2 py-1 text-center transition-colors hover:bg-muted/60"
            title="编辑标题"
          >
            <span className="truncate text-sm font-semibold text-foreground">
              {todo.title}
            </span>
            <Edit3 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/35 transition-colors group-hover:text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="z-10 flex items-center gap-2">
        {todo.status === "done" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            已完成
          </span>
        ) : todo.status === "doing" ? (
          <span className="inline-flex items-center rounded-full border border-primary/18 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">
            进行中
          </span>
        ) : todo.status === "cancelled" ? (
          <span className="inline-flex items-center rounded-full border border-border/55 bg-muted/65 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            已取消
          </span>
        ) : null}
        <TodoActionsMenu
          todo={todo}
          side="bottom"
          align="end"
          onDeleted={onDeleted}
          onRestored={onRestored}
          onDuplicated={onDuplicated}
        />
      </div>
    </div>
  );
}
