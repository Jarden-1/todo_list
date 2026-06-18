import { Clapperboard, MousePointerClick, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../../contexts/SettingsContext";
import { SettingsCard } from "./SettingsCard";
import { SettingsToggleRow } from "./SettingsToggleRow";

export function FeedbackSettingsSection() {
  const { settings, updateFeedback } = useSettings();

  return (
    <SettingsCard
      title="声音与反馈"
      description="完成待办音效、完成动画反馈、操作提示音"
      icon={Volume2}
      iconClassName="bg-emerald-500/12 text-emerald-500"
    >
      <div className="grid gap-3 xl:grid-cols-3">
        <SettingsToggleRow
          checked={settings.feedback.completeSound}
          onCheckedChange={(checked) => {
            void updateFeedback({ completeSound: checked }).catch((error) =>
              toast.error(error instanceof Error ? error.message : "反馈设置保存失败")
            );
          }}
          title="完成音效"
          description="点击完成待办时播放轻量正反馈音。"
          ariaLabel="切换完成音效"
        />
        <SettingsToggleRow
          checked={settings.feedback.completeAnimation}
          onCheckedChange={(checked) => {
            void updateFeedback({ completeAnimation: checked }).catch((error) =>
              toast.error(error instanceof Error ? error.message : "反馈设置保存失败")
            );
          }}
          title="完成动画"
          description="完成待办时保留短暂弹性反馈。"
          ariaLabel="切换完成动画"
        />
        <SettingsToggleRow
          checked={settings.feedback.operationSound}
          onCheckedChange={(checked) => {
            void updateFeedback({ operationSound: checked }).catch((error) =>
              toast.error(error instanceof Error ? error.message : "反馈设置保存失败")
            );
          }}
          title="操作提示音"
          description="为保存、复制等轻操作预留提示音。"
          ariaLabel="切换操作提示音"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1">
          <Clapperboard className="h-3 w-3" />
          完成反馈会优先保持轻量
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1">
          <MousePointerClick className="h-3 w-3" />
          提示音不会影响到期提醒
        </span>
      </div>
    </SettingsCard>
  );
}
