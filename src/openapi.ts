import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { cleanupOpenApiDoc } from "nestjs-zod";

const OPENAPI_PATH = "/openapi.json";
const DOCS_PATH = "/docs";
const SCALAR_DOCS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
].join("; ");

export async function setupOpenApi(app: INestApplication): Promise<void> {
  const config = new DocumentBuilder()
    .setTitle("NestJS Online Store API")
    .setDescription(
      "REST API for online store users, auth, categories, products, carts, and orders."
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token",
      },
      "bearer"
    )
    .addTag("App", "Base application endpoints")
    .addTag("Health", "Application and database health checks")
    .addTag("Auth", "Registration, login, and current user endpoints")
    .addTag("Categories", "Product category endpoints")
    .addTag("Products", "Product catalog endpoints")
    .addTag("Cart", "Customer cart endpoints")
    .addTag("Orders", "Checkout and order endpoints")
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  const httpAdapter = app.getHttpAdapter();
  const { apiReference } = await import("@scalar/nestjs-api-reference");

  httpAdapter.get(OPENAPI_PATH, (_req: unknown, res: Response) =>
    res.json(document)
  );
  const scalarDocsHandler = apiReference({
    pageTitle: "NestJS Online Store API Docs",
    url: OPENAPI_PATH,
  });

  httpAdapter.get(DOCS_PATH, (req: Request, res: Response) => {
    res.setHeader("Content-Security-Policy", SCALAR_DOCS_CSP);
    scalarDocsHandler(req, res);
  });
}
