import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { Role } from "../../generated/prisma/enums";

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum([Role.CUSTOMER, Role.ADMIN]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export class UserResponseDto extends createZodDto(userResponseSchema) {}

export type UserResponse = z.infer<typeof userResponseSchema>;
