import type { User } from "@prisma/client";

export interface AuthUserDto {
  id: string;
  loginName: string;
  displayName: string | null;
  timezone: string;
  createdAt?: string;
}

export interface AuthResponseDto {
  user: AuthUserDto;
}

export interface RegisterInput {
  loginName: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  loginName: string;
  password: string;
}

export function toAuthUserDto(
  user: Pick<User, "id" | "loginName" | "displayName" | "timezone" | "createdAt">,
  options: { includeCreatedAt?: boolean } = {}
): AuthUserDto {
  return {
    id: user.id,
    loginName: user.loginName,
    displayName: user.displayName,
    timezone: user.timezone,
    ...(options.includeCreatedAt ? { createdAt: user.createdAt.toISOString() } : {})
  };
}
