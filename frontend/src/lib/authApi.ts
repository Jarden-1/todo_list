import { apiRequest } from "./apiClient";

export interface AuthUser {
  id: string;
  loginName: string;
  displayName: string;
  timezone: string;
  createdAt?: string;
}

interface AuthResponse {
  user: AuthUser;
}

export interface LoginInput {
  loginName: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName?: string;
}

export function loginWithPassword(input: LoginInput) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function registerAccount(input: RegisterInput) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchCurrentUser(signal?: AbortSignal) {
  return apiRequest<AuthResponse>("/auth/me", { signal });
}

export function logoutCurrentSession() {
  return apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
}
