import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { userResponseSchema } from "../../users/schemas/user.schema";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  user: userResponseSchema,
});

export const currentUserResponseSchema = userResponseSchema;

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class AuthResponseDto extends createZodDto(authResponseSchema) {}
export class CurrentUserResponseDto extends createZodDto(
  currentUserResponseSchema
) {}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
