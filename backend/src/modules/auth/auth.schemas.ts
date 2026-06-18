import { z } from "zod";

const loginNameSchema = z
  .string({ required_error: "登录名不能为空" })
  .trim()
  .min(1, "登录名不能为空")
  .max(100, "登录名不能超过 100 个字符");

const passwordSchema = z
  .string({ required_error: "密码不能为空" })
  .min(6, "密码至少需要 6 个字符")
  .max(256, "密码不能超过 256 个字符");

const displayNameSchema = z
  .string()
  .trim()
  .max(80, "显示名不能超过 80 个字符")
  .optional()
  .transform((value) => (value ? value : undefined));

export const registerSchema = z.object({
  loginName: loginNameSchema,
  password: passwordSchema,
  displayName: displayNameSchema
});

export const loginSchema = z.object({
  loginName: loginNameSchema,
  password: passwordSchema
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
