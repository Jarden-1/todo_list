// SmartTodo - Mobile Detail Drawer (uses vaul)
import { Drawer } from "vaul";
import { Todo } from "../lib/types";
import { TodoDetailPanel } from "./TodoDetailPanel";

interface MobileDetailDrawerProps {
  todo: Todo | null;
  onClose: () => void;
}

export function MobileDetailDrawer({ todo, onClose }: MobileDetailDrawerProps) {
  return (
    <Drawer.Root
      open={!!todo}
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl overflow-hidden bg-[oklch(0.12_0.012_265)] max-h-[90vh]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/15" />
          </div>
          {todo && (
            <div className="flex-1 overflow-hidden">
              <TodoDetailPanel todo={todo} onClose={onClose} />
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
