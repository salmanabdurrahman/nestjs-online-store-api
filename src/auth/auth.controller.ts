import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ZodSerializerDto } from "nestjs-zod";
import type { AuthUser } from "./auth.types";
import { AuthService } from "./auth.service";
import {
  AuthResponseDto,
  CurrentUserResponseDto,
  LoginDto,
  RegisterDto,
} from "./schemas/auth.schema";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { UsersService } from "../users/users.service";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ZodSerializerDto(AuthResponseDto)
  @ApiOkResponse({ type: AuthResponseDto })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ZodSerializerDto(AuthResponseDto)
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("bearer")
  @ZodSerializerDto(CurrentUserResponseDto)
  @ApiOkResponse({ type: CurrentUserResponseDto })
  async me(@CurrentUser() user: AuthUser) {
    const currentUser = await this.usersService.findById(user.sub);
    return currentUser ? this.usersService.toResponse(currentUser) : undefined;
  }
}
