import { Role } from "../generated/prisma/enums";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type AuthUser = JwtPayload;
