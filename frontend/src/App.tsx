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

type AppPage = "home" | "login" | "settings";

function App() {
  const [page, setPage] = useState<AppPage>("home");
  useAutoHideScrollbars();

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <SettingsProvider>
          <TodoProvider>
            <TooltipProvider>
              <Toaster position="bottom-right" />
              {page === "login" ? (
                <LoginPage onLogin={() => setPage("home")} />
              ) : page === "settings" ? (
                <SettingsPage onBack={() => setPage("home")} onLogout={() => setPage("login")} />
              ) : (
                <Home onOpenSettings={() => setPage("settings")} onLogout={() => setPage("login")} />
              )}
            </TooltipProvider>
          </TodoProvider>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
