import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

/**
 * App-level settings that can't be expressed as module providers. Shared by
 * main.ts and the e2e tests so both boot the exact same HTTP surface.
 * (Validation, error formatting, the response envelope and the auth /
 * permission / rate-limit guards are registered as APP_* providers, so they
 * don't need to be repeated here.)
 */
export function setupApp<T extends INestApplication>(app: T): T {
  const config = app.get(ConfigService);

  app.use(helmet());

  const corsOrigins = config.getOrThrow<string[]>('app.corsOrigins');
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, credentials: true });
  }

  // `@Controller({ path: 'brands', version: '1' })` -> /v1/brands
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();

  if (config.getOrThrow<boolean>('app.swaggerEnabled')) {
    setupSwagger(app);
  }

  return app;
}

/** Swagger UI at /docs, raw OpenAPI JSON at /docs-json. */
function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('API')
      .setDescription(
        'Every response is wrapped as `{ message?, data? }`; errors as `{ message }`. ' +
          'Authorize with a bearer token carrying `sub` and `permissions` claims.',
      )
      .setVersion('1')
      .addBearerAuth()
      .build(),
  );

  SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: true } });
}
