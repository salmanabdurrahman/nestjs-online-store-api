import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { JwtPayload } from "./auth.types";
import { AuthResponse, LoginInput, RegisterInput } from "./schemas/auth.schema";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const passwordHash = await argon2.hash(input.password);
    const user = await this.usersService.create({
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email.toLowerCase());

    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(
    user: NonNullable<Awaited<ReturnType<UsersService["findByEmail"]>>>
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: "Bearer",
      user: this.usersService.toResponse(user),
    };
  }
}
