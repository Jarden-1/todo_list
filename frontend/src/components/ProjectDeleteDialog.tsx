import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "./ui/alert-dialog";
import { FolderInput, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Project } from "../lib/types";
import { cn } from "../lib/utils";

interface ProjectDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  todoCount: number;
  onConfirm: (mode: "move" | "delete") => Promise<void>;
}

export function ProjectDeleteDialog({
  open,
  onOpenChange,
  project,
  todoCount,
  onConfirm,
}: ProjectDeleteDialogProps) {
  const [mode, setMode] = useState<"move" | "delete">("move");
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm(mode);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>删除项目「{project?.name ?? ""}」</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {todoCount > 0
                  ? `该项目下有 ${todoCount} 条待办，请选择处理方式：`
                  : "该项目下没有待办，可以直接删除。"}
              </p>
              {todoCount > 0 && (
                <div className="space-y-2">
                  <label
                    className="flex items-start gap-2.5 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setMode("move")}
                  >
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={mode === "move"}
                      onChange={() => setMode("move")}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <FolderInput className="w-3.5 h-3.5" />
                        移到未分配
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        待办保留，项目字段清空，可在「未分配项目」中找到
                      </p>
                    </div>
                  </label>
                  <label
                    className="flex items-start gap-2.5 rounded-lg border border-destructive/30 p-3 cursor-pointer hover:bg-destructive/5 transition-colors"
                    onClick={() => setMode("delete")}
                  >
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={mode === "delete"}
                      onChange={() => setMode("delete")}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        一起删除
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {todoCount} 条待办也一并删除（可从垃圾箱恢复）
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors",
              mode === "delete"
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-primary hover:bg-primary/90",
              "disabled:opacity-50"
            )}
          >
            {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === "delete" ? "确认删除" : "确认移走"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
