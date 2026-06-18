import {
  Ban,
  Copy,
  CopyPlus,
  FileText,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import type { SyntheticEvent } from "react";
import { toast } from "sonner";
import type { Todo } from "../lib/types";
import { useTodo } from "../contexts/TodoContext";
import { copyToClipboard } from "../lib/clipboard";
import { formatTodoMarkdown, formatTodoPlainText } from "../lib/todoFormat";
import { cloneTodo } from "../lib/todoClone";
import { cn } from "../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface TodoActionsMenuProps {
  todo: Todo;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  triggerClassName?: string;
  contentClassName?: string;
  onDeleted?: () => void;
  onRestored?: () => void;
  onDuplicated?: (todo: Todo) => void;
}

function stopCardClick(event: SyntheticEvent) {
  event.stopPropagation();
}

export function TodoActionsMenu({
  todo,
  align = "end",
  side = "bottom",
  triggerClassName,
  contentClassName,
  onDeleted,
  onRestored,
  onDuplicated,
}: TodoActionsMenuProps) {
  const {
    todos,
    getProjectById,
    cancelTodo,
    deleteTodo,
    restoreTodo,
    duplicateTodo,
  } = useTodo();
  const project = getProjectById(todo.projectId);

  const copyText = async (format: "plain" | "markdown") => {
    const text =
      format === "plain"
        ? formatTodoPlainText(todo, project)
        : formatTodoMarkdown(todo, project);

    try {
      await copyToClipboard(text);
      toast.success(format === "plain" ? "已复制待办内容" : "已复制 Markdown");
    } catch {
      toast.error("复制失败，请稍后重试");
    }
  };

  const handleDuplicate = () => {
    const duplicated = duplicateTodo(todo.id);
    if (!duplicated) {
      toast.error("复制失败，待办不存在");
      return;
    }

    toast.success("已复制一份待办", {
      action: onDuplicated
        ? {
            label: "打开",
            onClick: () => onDuplicated(duplicated),
          }
        : undefined,
    });
  };

  const handleCancel = () => {
    if (todo.status === "cancelled") return;

    const snapshot = cloneTodo(todo);
    const index = todos.findIndex((item) => item.id === todo.id);
    cancelTodo(todo.id);
    toast("已取消待办", {
      action: {
        label: "撤销",
        onClick: () => {
          restoreTodo(snapshot, index);
          onRestored?.();
        },
      },
    });
  };

  const handleDelete = () => {
    const snapshot = cloneTodo(todo);
    const index = todos.findIndex((item) => item.id === todo.id);
    deleteTodo(todo.id);
    onDeleted?.();
    toast("待办已删除", {
      action: {
        label: "撤销",
        onClick: () => {
          restoreTodo(snapshot, index);
          onRestored?.();
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={stopCardClick}
          onPointerDown={stopCardClick}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors",
            "hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted/70 focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
            triggerClassName
          )}
          title="更多操作"
          aria-label={`更多操作：${todo.title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        className={cn("w-44 rounded-xl border-border/50 p-1.5 shadow-xl", contentClassName)}
        onClick={stopCardClick}
      >
        <DropdownMenuItem onSelect={() => void copyText("plain")}>
          <Copy className="h-4 w-4" />
          复制待办内容
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copyText("markdown")}>
          <FileText className="h-4 w-4" />
          复制 Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleDuplicate}>
          <CopyPlus className="h-4 w-4" />
          复制一份
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/55" />
        <DropdownMenuItem
          disabled={todo.status === "cancelled"}
          onSelect={handleCancel}
          className="text-muted-foreground"
        >
          <Ban className="h-4 w-4" />
          取消待办
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={handleDelete}
          className="text-red-500/80 focus:bg-red-500/10 focus:text-red-600 dark:text-red-300/80 dark:focus:text-red-200"
        >
          <Trash2 className="h-4 w-4" />
          删除待办
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
