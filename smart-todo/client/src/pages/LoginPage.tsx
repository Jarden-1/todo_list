// SmartTodo - Login Page
// Simulated front-end auth with dead accounts
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { Eye, EyeOff, Sparkles, LogIn } from "lucide-react";
import { cn } from "../lib/utils";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663756374270/DGd4eqCYayiLdVjVXhEfFj/logo-icon-9HsBNNDLVXMHKrpvu4gSPu.webp";

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("demo@smarttodo.app");
  const [password, setPassword] = useState("demo123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Simulate async delay
    await new Promise((r) => setTimeout(r, 600));
    const result = login(email, password);
    setLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error ?? "登录失败");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-violet-500/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo & title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center shadow-lg shadow-primary/25">
              <img src={LOGO_URL} alt="SmartTodo" className="w-9 h-9" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">SmartTodo</h1>
          <p className="text-sm text-muted-foreground mt-1">智能待办管理，专注高效工作</p>
        </div>

        {/* Login card */}
        <div className="glass-card rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-semibold text-foreground mb-5">登录账号</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="field-input"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="field-input pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold",
                "ai-btn",
                loading && "ai-btn-loading"
              )}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                  登录中…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  登录
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 rounded-xl bg-muted border border-border">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              演示账号（已预填）
            </p>
            <div className="space-y-0.5">
              <p className="text-[11px] text-foreground/70">
                邮箱：<span className="font-mono text-primary">demo@smarttodo.app</span>
              </p>
              <p className="text-[11px] text-foreground/70">
                密码：<span className="font-mono text-primary">demo123</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-5">
          SmartTodo · 前端演示版本 · 数据存储于本地
        </p>
      </div>
    </div>
  );
}
