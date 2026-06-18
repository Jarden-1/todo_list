export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_ERROR"
  | "AI_KEY_REQUIRED"
  | "INTERNAL_SERVER_ERROR";

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  details: unknown;
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode = 400,
    details: unknown = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function toErrorResponse(error: ApiErrorPayload): { error: ApiErrorPayload } {
  return { error };
}
