import { INestApplication, VersioningType } from '@nestjs/common';

/**
 * App-level settings that can't be expressed as module providers. Shared by
 * main.ts and the e2e tests so both boot the exact same HTTP surface.
 * (Validation, error formatting and the response envelope are registered by
 * CoreModule as APP_* providers, so they don't need to be repeated here.)
 */
export function setupApp<T extends INestApplication>(app: T): T {
  // `@Controller({ path: 'brands', version: '1' })` -> /v1/brands
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();
  return app;
}
