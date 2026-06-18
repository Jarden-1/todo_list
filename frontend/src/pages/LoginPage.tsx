import { useState } from "react";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663756374270/DGd4eqCYayiLdVjVXhEfFj/logo-icon-9HsBNNDLVXMHKrpvu4gSPu.webp";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("demo@smarttodo.app");
  const [password, setPassword] = useState("demo123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    setLoading(false);
    onLogin();
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
          <h2 className="text-base font-semibold text-foreground mb-5">登录账号</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="settings-label mb-1.5">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="settings-label mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input pr-10"
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "ai-btn w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold",
                loading && "ai-btn-loading"
              )}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  登录
                </>
              )}
            </button>
          </form>

          <div className="mt-4 p-3 rounded-xl bg-muted border border-border">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              演示账号已预填
            </p>
            <p className="text-[11px] text-muted-foreground">当前是纯前端页面，点击登录即可进入。</p>
          </div>
        </section>
      </div>
    </main>
  );
}
