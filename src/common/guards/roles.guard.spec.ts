import { Reflector } from "@nestjs/core";
import { Role } from "../../generated/prisma/enums";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const makeContext = (role?: Role) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role
            ? { sub: "user-1", email: "u@example.com", role }
            : undefined,
        }),
      }),
    }) as never;

  beforeEach(() => jest.clearAllMocks());

  it("allows route without roles", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValueOnce(undefined);

    expect(new RolesGuard(reflector).canActivate(makeContext())).toBe(true);
  });

  it("allows matching role and denies missing/non-matching role", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(Role.ADMIN))).toBe(true);
    expect(guard.canActivate(makeContext(Role.CUSTOMER))).toBe(false);
    expect(guard.canActivate(makeContext())).toBe(false);
  });
});
