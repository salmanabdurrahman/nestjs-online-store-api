import { registerAs } from "@nestjs/config";

export const databaseConfig = registerAs("database", () => ({
  url:
    process.env.NODE_ENV === "test" && process.env.DATABASE_URL_TEST
      ? process.env.DATABASE_URL_TEST
      : process.env.DATABASE_URL,
}));
