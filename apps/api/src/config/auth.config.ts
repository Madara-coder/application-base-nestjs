import { registerAs } from '@nestjs/config';

/**
 * Access tokens are verified with this secret (HS256). Tokens are issued by
 * whatever owns users/login - an identity service or a future auth module -
 * with `sub` (user id) and `permissions` claims. `npm run token` mints one
 * for local development.
 */
export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET as string,
  jwtIssuer: process.env.JWT_ISSUER || undefined,
  jwtAudience: process.env.JWT_AUDIENCE || undefined,
}));
