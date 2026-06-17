import { Injectable } from "@nestjs/common";
import { Role } from "../generated/prisma/enums";
import { UserModel } from "../generated/prisma/models/User";
import { PrismaService } from "../database/prisma.service";

export type CreateUserData = {
  email: string;
  passwordHash: string;
  name: string;
  role?: Role;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<UserModel | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<UserModel | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: CreateUserData): Promise<UserModel> {
    return this.prisma.user.create({ data });
  }
}
