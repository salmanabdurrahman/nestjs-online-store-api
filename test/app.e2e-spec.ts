import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { PrismaService } from "./../src/database/prisma.service";
import { setupOpenApi } from "./../src/openapi";

type HealthResponseBody = {
  timestamp: string;
  uptime: number;
};

type OpenApiResponseBody = {
  openapi?: string;
  info: Record<string, unknown>;
  components: {
    securitySchemes: {
      bearer: Record<string, unknown>;
    };
  };
  paths: Record<string, unknown>;
};

type AuthResponseBody = {
  accessToken: string;
  user: {
    email: string;
    name: string;
    role: string;
    passwordHash?: string;
  };
};

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;
  const users: Array<{
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: "CUSTOMER" | "ADMIN";
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const prismaMock = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
    user: {
      findUnique: jest.fn(
        ({ where }: { where: { id?: string; email?: string } }) =>
          Promise.resolve(
            users.find(
              (user) => user.id === where.id || user.email === where.email
            ) ?? null
          )
      ),
      create: jest.fn(
        ({
          data,
        }: {
          data: { email: string; passwordHash: string; name: string };
        }) => {
          const now = new Date();
          const user = {
            id: `00000000-0000-4000-8000-${String(users.length + 1).padStart(
              12,
              "0"
            )}`,
            email: data.email,
            passwordHash: data.passwordHash,
            name: data.name,
            role: "CUSTOMER" as const,
            createdAt: now,
            updatedAt: now,
          };
          users.push(user);
          return Promise.resolve(user);
        }
      ),
    },
  };

  beforeEach(async () => {
    users.length = 0;
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));
    await setupOpenApi(app);
    await app.init();
  });

  it("/ (GET)", () => {
    return request(app.getHttpServer())
      .get("/api/v1")
      .expect(200)
      .expect("Hello World!");
  });

  it("/api/v1/health (GET)", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200);

    const body = response.body as HealthResponseBody;

    expect(body).toMatchObject({
      status: "ok",
      database: {
        status: "ok",
      },
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.uptime).toEqual(expect.any(Number));
  });

  it("/openapi.json (GET)", async () => {
    const response = await request(app.getHttpServer())
      .get("/openapi.json")
      .expect(200);

    const body = response.body as OpenApiResponseBody;

    expect(body.openapi).toBeDefined();
    expect(body.info).toMatchObject({
      title: "NestJS Online Store API",
      version: "1.0.0",
    });
    expect(body.components.securitySchemes.bearer).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
    expect(body.paths["/api/v1/health"]).toBeDefined();
  });

  it("/docs (GET)", () => {
    return request(app.getHttpServer())
      .get("/docs")
      .expect(200)
      .expect("Content-Type", /html/);
  });

  it("auth token flow", async () => {
    const email = "customer@example.com";
    const password = "password123";

    const registerResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password, name: "Customer User" })
      .expect(201);

    const registerBody = registerResponse.body as AuthResponseBody;

    expect(registerBody.accessToken).toEqual(expect.any(String));
    expect(registerBody.user).toMatchObject({
      email,
      name: "Customer User",
      role: "CUSTOMER",
    });
    expect(registerBody.user.passwordHash).toBeUndefined();

    const loginResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(201);

    const loginBody = loginResponse.body as AuthResponseBody;

    expect(loginBody.accessToken).toEqual(expect.any(String));

    await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);

    const meResponse = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const meBody = meResponse.body as AuthResponseBody["user"];

    expect(meBody).toMatchObject({
      email,
      name: "Customer User",
      role: "CUSTOMER",
    });
    expect(meBody.passwordHash).toBeUndefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
