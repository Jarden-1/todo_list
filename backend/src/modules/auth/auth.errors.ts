import { ApiError, type ApiErrorCode } from "../../common/apiError";

export type AuthErrorCode =
  | "LOGIN_NAME_TAKEN"
  | "INVALID_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR";

export function authError(
  code: AuthErrorCode,
  message: string,
  statusCode: number,
  details: unknown = {}
): ApiError {
  return new ApiError(code as ApiErrorCode, message, statusCode, details);
}

export function unauthenticatedError(): ApiError {
  return authError("UNAUTHENTICATED", "请先登录", 401);
}

export function invalidCredentialsError(): ApiError {
  return authError("INVALID_CREDENTIALS", "登录名或密码不正确", 401);
}
