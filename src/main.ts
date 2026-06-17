import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import helmet from "helmet";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { setupOpenApi } from "./openapi";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = new Logger("Bootstrap");
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const port = configService.get<number>("app.port", 3000);
  const corsOrigins = configService.get<string[]>("app.corsOrigins", []);
  const isProduction =
    configService.get<string>("app.nodeEnv") === "production";

  if (isProduction && corsOrigins.length === 0) {
    throw new Error(
      "CORS_ORIGINS must be configured in production. Refusing to start with permissive CORS."
    );
  }

  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : isProduction ? false : true,
    credentials: true,
  });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalInterceptors(new ZodSerializerInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());
  await setupOpenApi(app);

  await app.listen(port);
  app.enableShutdownHooks();
  logger.log(`Application running on port ${port}`);
}
void bootstrap();
