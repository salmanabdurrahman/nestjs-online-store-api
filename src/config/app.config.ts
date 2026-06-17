import { registerAs } from "@nestjs/config";

function parseCorsOrigins(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const appConfig = registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
}));
