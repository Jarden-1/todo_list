import { ArrowLeft } from "lucide-react";
import { AiSettingsSection } from "../components/settings/AiSettingsSection";
import { FeedbackSettingsSection } from "../components/settings/FeedbackSettingsSection";
import { ReminderSettingsSection } from "../components/settings/ReminderSettingsSection";
import { SettingsSidePanel } from "../components/settings/SettingsSidePanel";

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void;
}

export default function SettingsPage({ onBack, onLogout }: SettingsPageProps) {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur md:px-8">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="返回"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-sm font-bold text-foreground">设置</h1>
          <p className="hidden text-[10px] text-muted-foreground sm:block">AI 助手、提醒、反馈和账户数据</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1428px] px-4 py-6 md:px-8 md:py-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-6">
          <div className="min-w-0 space-y-5">
            <AiSettingsSection />
            <ReminderSettingsSection />
            <FeedbackSettingsSection />
          </div>
          <SettingsSidePanel onLogout={onLogout} />
        </div>
      </div>
    </main>
  );
}
