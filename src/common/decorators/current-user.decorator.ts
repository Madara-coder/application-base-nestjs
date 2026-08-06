import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * `create(@CurrentUser('id') userId: string)` - reads `request.user`
 * (populated by your auth guard/strategy, e.g. a JwtStrategy). Optional
 * `key` picks a single property off the user object.
 */
export const CurrentUser = createParamDecorator((key: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  return key ? user?.[key] : user;
});
