import "dotenv/config";

import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  SESSION_COOKIE_NAME: z.string().min(1).default("smarttodo.sid"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  AI_KEY_ENCRYPTION_SECRET: z
    .string()
    .min(32, "AI_KEY_ENCRYPTION_SECRET must be at least 32 characters"),
  UPLOAD_DIR: z.string().min(1).default("uploads"),
  SOFT_DELETE_RETENTION_DAYS: z.coerce.number().int().positive().default(3),
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().default(""),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().default(""),
  WEB_PUSH_SUBJECT: z.string().default("mailto:admin@example.com")
});

export const config = envSchema.parse(process.env);

export const uploadDir = path.isAbsolute(config.UPLOAD_DIR)
  ? config.UPLOAD_DIR
  : path.resolve(process.cwd(), config.UPLOAD_DIR);

export type AppConfig = typeof config;
