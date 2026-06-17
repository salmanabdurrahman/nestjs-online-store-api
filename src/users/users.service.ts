import { ConflictException, Injectable } from "@nestjs/common";
import { Role } from "../generated/prisma/enums";
import { UserModel } from "../generated/prisma/models/User";
import { UserResponse } from "./schemas/user.schema";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findById(id: string): Promise<UserModel | null> {
    return this.usersRepository.findById(id);
  }

  findByEmail(email: string): Promise<UserModel | null> {
    return this.usersRepository.findByEmail(email);
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role?: Role;
  }): Promise<UserModel> {
    const existingUser = await this.usersRepository.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    return this.usersRepository.create(data);
  }

  toResponse(user: UserModel): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
