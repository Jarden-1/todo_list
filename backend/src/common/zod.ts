import type { ZodError } from "zod";

export interface ZodValidationDetails {
  fields: Array<{
    path: string;
    message: string;
    code: string;
  }>;
}

export function zodErrorToDetails(error: ZodError): ZodValidationDetails {
  return {
    fields: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code
    }))
  };
}
