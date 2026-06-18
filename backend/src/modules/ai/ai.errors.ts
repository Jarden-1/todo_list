import { ApiError, type ApiErrorCode } from "../../common/apiError";

export type AiModuleErrorCode =
  | "AI_MODEL_ERROR"
  | "AI_RESULT_INVALID"
  | "UNDO_EXPIRED"
  | "UNDO_ALREADY_CONSUMED";

function moduleErrorCode(code: AiModuleErrorCode): ApiErrorCode {
  return code as ApiErrorCode;
}

export function aiModuleError(
  code: AiModuleErrorCode,
  message: string,
  statusCode = 422,
  details: unknown = {}
): ApiError {
  return new ApiError(moduleErrorCode(code), message, statusCode, details);
}
