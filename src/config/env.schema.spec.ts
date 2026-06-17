import { validateEnv } from "./env.schema";

const baseEnv = {
  NODE_ENV: "test",
  PORT: "3000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/app",
  JWT_SECRET: "long-enough-secret",
  JWT_ACCESS_EXPIRES_IN: "15m",
  CORS_ORIGINS: "",
};

describe("validateEnv", () => {
  it("accepts valid test config", () => {
    expect(validateEnv(baseEnv)).toMatchObject({
      NODE_ENV: "test",
      PORT: 3000,
      DATABASE_URL: baseEnv.DATABASE_URL,
    });
  });

  it("rejects missing or weak JWT secret", () => {
    expect(() => validateEnv({ ...baseEnv, JWT_SECRET: "short" })).toThrow(
      /JWT_SECRET/
    );
  });

  it("requires CORS_ORIGINS in production", () => {
    expect(() =>
      validateEnv({ ...baseEnv, NODE_ENV: "production", CORS_ORIGINS: "" })
    ).toThrow(/CORS_ORIGINS/);
  });
});
