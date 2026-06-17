import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PrismaService } from "../database/prisma.service";

type HealthResponse = {
  status: "ok";
  timestamp: string;
  uptime: number;
  database: {
    status: "ok";
  };
};

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({
    description: "Application and database are healthy.",
    schema: {
      example: {
        status: "ok",
        timestamp: "2026-06-17T00:00:00.000Z",
        uptime: 12.34,
        database: {
          status: "ok",
        },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: "Database health check failed.",
  })
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException("Database health check failed");
    }

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: "ok",
      },
    };
  }
}
