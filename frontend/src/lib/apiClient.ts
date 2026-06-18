export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    total?: number;
    nextCursor?: string | null;
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const API_BASE_URL = configuredApiBase.endsWith("/api/v1")
  ? configuredApiBase
  : `${configuredApiBase}/api/v1`;

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readApiError(response: Response) {
  try {
    const payload = await response.json();
    const error = payload?.error;

    if (error && typeof error === "object") {
      return {
        message: error.message ?? response.statusText,
        code: error.code,
        details: error.details,
      };
    }

    return {
      message: payload?.message ?? payload?.error ?? response.statusText,
      code: undefined,
      details: undefined,
    };
  } catch {
    return {
      message: response.statusText,
      code: undefined,
      details: undefined,
    };
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    const error = await readApiError(response);
    throw new ApiError(error.message, response.status, error.code, error.details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T> | T;
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return "后端接口暂不可用（404），请确认后端服务和代理配置。";
    if (error.status === 401) return error.message || "请先登录。";
    return error.message;
  }

  if (error instanceof TypeError) {
    return "无法连接后端服务，请确认后端已启动。";
  }

  if (error instanceof Error) return error.message;
  return "请求失败，请稍后再试";
}
