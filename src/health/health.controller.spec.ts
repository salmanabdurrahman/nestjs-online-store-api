import { ServiceUnavailableException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../database/prisma.service";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("returns app and database health", async () => {
    const result = await controller.check();

    expect(result).toMatchObject({
      status: "ok",
      database: {
        status: "ok",
      },
    });
    expect(result.timestamp).toEqual(expect.any(String));
    expect(result.uptime).toEqual(expect.any(Number));
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("throws service unavailable when database ping fails", async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });
});
