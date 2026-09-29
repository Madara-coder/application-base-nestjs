import { Global, Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { MessageService } from './i18n/message.service.js';

/**
 * Import once in AppModule. Registers the global validation pipe, exception
 * filter and response-envelope interceptor for every route (equivalent of
 * CoreServiceProvider wiring exception formatting/macros once for every
 * Laravel module), and exposes MessageService + PermissionsGuard for
 * feature modules to inject / apply.
 *
 * Registered as APP_* providers rather than app.useGlobal*() in main.ts so
 * they also apply to e2e tests that boot AppModule through Test.createTestingModule().
 *
 *   @Module({ imports: [CoreModule, TypeOrmModule.forRootAsync(...), BrandModule] })
 *   export class AppModule {}
 */
@Global()
@Module({
  providers: [
    MessageService,
    PermissionsGuard,
    {
      provide: APP_PIPE,
      // whitelist: true strips unknown DTO fields (the class-validator
      // equivalent of Laravel's $fillable allow-list). Comparison-operator
      // query params (__gte_price) bypass this entirely - they're read via
      // @ListQuery(), never through a validated DTO.
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
  ],
  exports: [MessageService, PermissionsGuard],
})
export class CoreModule {}
