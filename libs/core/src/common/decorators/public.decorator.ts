import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route (or a whole controller) out of JwtAuthGuard, which the app
 * registers globally so every route is authenticated by default.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
