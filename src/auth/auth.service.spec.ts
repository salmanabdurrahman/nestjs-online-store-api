import { UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { Role } from "../generated/prisma/enums";
import { UserModel } from "../generated/prisma/models/User";
import { AuthService } from "./auth.service";

jest.mock("argon2", () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

const now = new Date("2026-01-01T00:00:00.000Z");
const user = {
  id: "user-1",
  email: "customer@example.com",
  name: "Customer",
  passwordHash: "hash",
  role: Role.CUSTOMER,
  createdAt: now,
  updatedAt: now,
};

describe("AuthService", () => {
  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    toResponse: jest.fn((value: UserModel) => ({
      id: value.id,
      email: value.email,
      name: value.name,
      role: value.role,
      createdAt: value.createdAt.toISOString(),
      updatedAt: value.updatedAt.toISOString(),
    })),
  };
  const jwtService = { signAsync: jest.fn() };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(usersService as never, jwtService as never);
    jwtService.signAsync.mockResolvedValue("signed-token");
  });

  it("registers with lowercase email, hashed password, and safe response", async () => {
    jest.mocked(argon2.hash).mockResolvedValueOnce("hash");
    usersService.create.mockResolvedValueOnce(user);

    const result = await service.register({
      email: "Customer@Example.com",
      password: "password123",
      name: "Customer",
    });

    expect(argon2.hash).toHaveBeenCalledWith("password123");
    expect(usersService.create).toHaveBeenCalledWith({
      email: "customer@example.com",
      passwordHash: "hash",
      name: "Customer",
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    expect(result).toMatchObject({ accessToken: "signed-token" });
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("logs in valid credentials", async () => {
    usersService.findByEmail.mockResolvedValueOnce(user);
    jest.mocked(argon2.verify).mockResolvedValueOnce(true);

    await expect(
      service.login({ email: "Customer@Example.com", password: "password123" })
    ).resolves.toMatchObject({ accessToken: "signed-token" });

    expect(usersService.findByEmail).toHaveBeenCalledWith(
      "customer@example.com"
    );
  });

  it("rejects missing user or invalid password", async () => {
    usersService.findByEmail.mockResolvedValueOnce(null);

    await expect(
      service.login({ email: "missing@example.com", password: "password123" })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    usersService.findByEmail.mockResolvedValueOnce(user);
    jest.mocked(argon2.verify).mockResolvedValueOnce(false);

    await expect(
      service.login({ email: user.email, password: "wrong-password" })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
