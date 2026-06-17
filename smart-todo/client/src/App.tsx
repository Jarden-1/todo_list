// SmartTodo - App Root
// Themes: switchable light/dark
// Routes: /login, / (main), /settings
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TodoProvider } from "./contexts/TodoContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  const { isLoggedIn } = useAuth();
  return (
    <Switch>
      <Route path="/login">
        {isLoggedIn ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <SettingsProvider>
          <AuthProvider>
            <TodoProvider>
              <TooltipProvider>
                <Toaster position="bottom-right" />
                <Router />
              </TooltipProvider>
            </TodoProvider>
          </AuthProvider>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
