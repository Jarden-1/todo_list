// SmartTodo - Auth Context (simulated front-end login)
// Dead accounts stored in MOCK_USERS; no real backend
import React, { createContext, useContext, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextValue {
  isLoggedIn: boolean;
  user: User | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const MOCK_USERS: Array<{ email: string; password: string; user: User }> = [
  {
    email: "demo@smarttodo.app",
    password: "demo123",
    user: { id: "user-1", name: "Demo 用户", email: "demo@smarttodo.app" },
  },
  {
    email: "admin@smarttodo.app",
    password: "admin123",
    user: { id: "user-2", name: "管理员", email: "admin@smarttodo.app" },
  },
];

const AUTH_KEY = "smarttodo:auth";

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadUser());

  const login = (email: string, password: string): { success: boolean; error?: string } => {
    const match = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!match) {
      return { success: false, error: "邮箱或密码错误" };
    }
    setUser(match.user);
    localStorage.setItem(AUTH_KEY, JSON.stringify(match.user));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
