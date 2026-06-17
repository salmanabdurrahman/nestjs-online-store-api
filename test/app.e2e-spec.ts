import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { setupOpenApi } from "./../src/openapi";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await setupOpenApi(app);
    await app.init();
  });

  it("/ (GET)", () => {
    return request(app.getHttpServer())
      .get("/")
      .expect(200)
      .expect("Hello World!");
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
