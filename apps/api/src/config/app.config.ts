import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const env = process.env.NODE_ENV ?? 'development';

  return {
    env,
    port: parseInt(process.env.PORT ?? '3000', 10),
    // Comma-separated allowed origins; unset disables CORS (same-origin only).
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    // Swagger UI at /docs - on by default everywhere except production.
    swaggerEnabled: process.env.SWAGGER_ENABLED ? process.env.SWAGGER_ENABLED === 'true' : env !== 'production',
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    },
  };
});
