import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]);

export const envSchema = z.object({
  NODE_ENV: nodeEnvSchema.default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  DATABASE_URL_TEST: z.string().url().optional(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("15m"),
  CORS_ORIGINS: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${message}`);
  }

  return parsed.data;
}
