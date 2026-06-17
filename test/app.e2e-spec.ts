import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { PrismaService } from "./../src/database/prisma.service";
import { setupOpenApi } from "./../src/openapi";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;
  const prismaMock = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
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

    expect(response.body).toMatchObject({
      status: "ok",
      database: {
        status: "ok",
      },
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.uptime).toEqual(expect.any(Number));
  });

  it("/openapi.json (GET)", async () => {
    const response = await request(app.getHttpServer())
      .get("/openapi.json")
      .expect(200);

    expect(response.body.openapi).toBeDefined();
    expect(response.body.info).toMatchObject({
      title: "NestJS Online Store API",
      version: "1.0.0",
    });
    expect(response.body.components.securitySchemes.bearer).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
    expect(response.body.paths["/api/v1/health"]).toBeDefined();
  });

  it("/docs (GET)", () => {
    return request(app.getHttpServer())
      .get("/docs")
      .expect(200)
      .expect("Content-Type", /html/);
  });

  afterEach(async () => {
    await app.close();
  });
});
