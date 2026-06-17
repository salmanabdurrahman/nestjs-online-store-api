process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/nestjs_online_store?schema=public";
process.env.DATABASE_URL_TEST ??=
  "postgresql://postgres:postgres@localhost:5432/nestjs_online_store_test?schema=public";
process.env.JWT_SECRET ??= "test-jwt-secret-minimum-16-chars";
process.env.JWT_ACCESS_EXPIRES_IN ??= "15m";
process.env.CORS_ORIGINS ??= "http://localhost:3000";
