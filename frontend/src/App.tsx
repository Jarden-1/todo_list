import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TodoProvider } from "./contexts/TodoContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { useState } from "react";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import { useAutoHideScrollbars } from "./hooks/useTransientScrollbar";
import { useNotifications } from "./hooks/useNotifications";
import { NotificationDialog } from "./components/NotificationDialog";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

type AppPage = "home" | "settings";

function AppServices({ onOpenTodo }: { onOpenTodo: (todoId: string) => void }) {
  const {
    activeNotification,
    hasActiveNotification,
    dismissActiveNotification,
    muteActiveNotification,
    viewActiveNotificationTodo,
  } = useNotifications({ onOpenTodo });

  return (
    <NotificationDialog
      notification={activeNotification}
      open={hasActiveNotification}
      onDismiss={dismissActiveNotification}
      onMute={muteActiveNotification}
      onViewTodo={viewActiveNotificationTodo}
    />
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        正在确认登录状态...
      </div>
    </main>
  );
}

function AuthenticatedApp() {
  const { logout } = useAuth();
  const [page, setPage] = useState<AppPage>("home");

  const handleLogout = async () => {
    await logout();
    setPage("home");
  };

  return (
    <SettingsProvider>
      <TodoProvider>
        <AppServices onOpenTodo={() => setPage("home")} />
        {page === "settings" ? (
          <SettingsPage onBack={() => setPage("home")} onLogout={handleLogout} />
        ) : (
          <Home onOpenSettings={() => setPage("settings")} onLogout={handleLogout} />
        )}
      </TodoProvider>
    </SettingsProvider>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  useAutoHideScrollbars();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <AuthProvider>
          <TooltipProvider>
            <Toaster position="bottom-right" />
            <AppShell />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
