import { BellRing } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import type { SmartTodoNotification } from "../lib/pushNotifications";

interface NotificationDialogProps {
  notification: SmartTodoNotification | null;
  open: boolean;
  onViewTodo: () => void;
  onDismiss: () => void;
  /** "不再提醒" — dismiss this notification AND mute all future reminders
   *  for the same todo so the reminder worker stops firing. */
  onMute: () => void;
}

export function NotificationDialog({
  notification,
  open,
  onViewTodo,
  onDismiss,
  onMute,
}: NotificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onDismiss()}>
      <DialogContent
        className="max-w-[420px] rounded-2xl border-border/45 p-0 shadow-2xl"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="p-5">
          <DialogHeader className="gap-3 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-500">
                <BellRing className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base leading-6">
                  {notification?.title ?? "SmartTodo 提醒"}
                </DialogTitle>
                <DialogDescription className="mt-1 whitespace-pre-wrap text-sm leading-6">
                  {notification?.body ?? "你有一条新的待办提醒。"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-5 flex-row justify-end gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onMute}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              不再提醒
            </button>
            <button
              type="button"
              onClick={onViewTodo}
              className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              查看任务
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
