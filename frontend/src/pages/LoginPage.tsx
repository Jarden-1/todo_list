import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { getApiErrorMessage } from "../lib/apiClient";
import { cn } from "../lib/utils";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663756374270/DGd4eqCYayiLdVjVXhEfFj/logo-icon-9HsBNNDLVXMHKrpvu4gSPu.webp";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const { login, register, error, clearAuthError } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginName, setLoginName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    clearAuthError();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          loginName,
          password,
          displayName: displayName.trim() || undefined,
        });
        toast.success("注册成功，已进入 SmartTodo");
      } else {
        await login({ loginName, password });
        toast.success("登录成功");
      }
    } catch (caught) {
      toast.error(getApiErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center shadow-lg shadow-primary/20">
            <img src={LOGO_URL} alt="SmartTodo" className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">SmartTodo</h1>
          <p className="text-sm text-muted-foreground mt-1">智能待办管理</p>
        </div>

        <section className="glass-card rounded-2xl p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              {isRegister ? "注册账号" : "登录账号"}
            </h2>
            <div className="grid grid-cols-2 rounded-lg bg-muted p-0.5 text-xs">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 font-medium transition-colors",
                  !isRegister ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 font-medium transition-colors",
                  isRegister ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                注册
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="settings-label mb-1.5">登录名</label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="field-input"
                autoComplete="username"
                placeholder="用户名、邮箱、手机号或中文名"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="settings-label mb-1.5">显示名</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="field-input"
                  autoComplete="name"
                  placeholder="可选，默认使用登录名"
                  maxLength={80}
                />
              </div>
            )}

            <div>
              <label className="settings-label mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input pr-10"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isRegister && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">密码至少 6 个字符。</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/8 px-3 py-2 text-xs leading-5 text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !loginName.trim() || password.length < 6}
              className={cn(
                "ai-btn w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold",
                loading && "ai-btn-loading"
              )}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                  {isRegister ? "注册中..." : "登录中..."}
                </>
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  注册并进入
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  登录
                </>
              )}
            </button>
          </form>

        </section>
      </div>
    </main>
  );
}
