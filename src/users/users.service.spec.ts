import { ConflictException } from "@nestjs/common";
import { Role } from "../generated/prisma/enums";
import { UsersService } from "./users.service";

const now = new Date("2026-01-01T00:00:00.000Z");
const user = {
  id: "user-1",
  email: "user@example.com",
  name: "User",
  passwordHash: "secret-hash",
  role: Role.CUSTOMER,
  createdAt: now,
  updatedAt: now,
};

describe("UsersService", () => {
  const repository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(repository as never);
  });

  it("rejects duplicate email", async () => {
    repository.findByEmail.mockResolvedValueOnce(user);

    await expect(
      service.create({ email: user.email, passwordHash: "hash", name: "User" })
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates user when email available", async () => {
    repository.findByEmail.mockResolvedValueOnce(null);
    repository.create.mockResolvedValueOnce(user);

    await expect(
      service.create({ email: user.email, passwordHash: "hash", name: "User" })
    ).resolves.toBe(user);
  });

  it("maps response without passwordHash", () => {
    expect(service.toResponse(user)).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });
});
