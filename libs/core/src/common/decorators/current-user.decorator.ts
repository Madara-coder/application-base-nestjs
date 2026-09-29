import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

/**
 * `create(@CurrentUser('id') userId: string)` - reads the AuthUser that
 * JwtAuthGuard attached to `request.user`. Optional `key` picks a single
 * property off it; without one you get the whole AuthUser.
 */
export const CurrentUser = createParamDecorator((key: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
  return key ? user?.[key] : user;
});
