import { useRef } from "react";
import { Database, Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../../contexts/SettingsContext";
import { useTodo } from "../../contexts/TodoContext";
import {
  clearWorkspace,
  exportWorkspace,
  importWorkspace,
} from "../../lib/workspaceApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

export function SettingsDataActions() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { resetSettings } = useSettings();
  const { refreshWorkspace } = useTodo();

  const exportData = async () => {
    try {
      const backup = await exportWorkspace();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `smarttodo-account-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("账户数据已导出");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导出失败");
    }
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      await importWorkspace(parsed);
      await refreshWorkspace();
      toast.success("账户数据已导入");
    } catch (error) {
      toast.error(error instanceof Error ? `导入失败：${error.message}` : "导入失败：无法读取这个文件");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleResetSettings = async () => {
    try {
      await resetSettings();
      toast.success("设置已恢复默认");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置重置失败");
    }
  };

  const handleClearWorkspace = async () => {
    try {
      await clearWorkspace();
      await refreshWorkspace();
      toast.success("服务端数据已清空");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "清空失败");
    }
  };

  return (
    <div className="settings-side-data-panel">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">数据</p>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">备份、恢复和清理当前账户的服务端数据。</p>
        </div>
      </div>

      <div className="settings-side-action-list">
        <button type="button" onClick={() => void exportData()} className="settings-side-action">
          <Download className="h-3.5 w-3.5 text-primary" />
          <span className="settings-side-action-copy">
            <span className="settings-side-action-title">导出数据</span>
            <span className="settings-side-action-desc">下载一份账户数据备份</span>
          </span>
        </button>

        <button type="button" onClick={() => fileInputRef.current?.click()} className="settings-side-action">
          <Upload className="h-3.5 w-3.5 text-primary" />
          <span className="settings-side-action-copy">
            <span className="settings-side-action-title">导入数据</span>
            <span className="settings-side-action-desc">导入到当前账户</span>
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importData(file);
          }}
        />

        <button
          type="button"
          onClick={() => void handleResetSettings()}
          className="settings-side-action"
        >
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="settings-side-action-copy">
            <span className="settings-side-action-title">恢复默认</span>
            <span className="settings-side-action-desc">只重置设置，不删除待办</span>
          </span>
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className="settings-side-action settings-side-danger">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="settings-side-action-copy">
                <span className="settings-side-action-title">清空数据</span>
                <span className="settings-side-action-desc">删除所有服务端待办和项目</span>
              </span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>清空当前账户数据？</AlertDialogTitle>
              <AlertDialogDescription>
                这个操作会删除当前账户的待办、项目和标签。建议先导出一份备份。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500/90 text-white hover:bg-red-500"
                onClick={() => void handleClearWorkspace()}
              >
                清空数据
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
