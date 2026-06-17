import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "../../auth/auth.types";

type RequestWithUser = {
  user?: AuthUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  }
);
