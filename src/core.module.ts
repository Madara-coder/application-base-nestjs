import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './interceptors/transform-response.interceptor';
import { PermissionsGuard } from './guards/permissions.guard';
import { MessageService } from './i18n/message.service';

/**
 * Import once in AppModule. Registers the global exception filter +
 * response-envelope interceptor for every route (equivalent of
 * CoreServiceProvider wiring exception formatting/macros once for every
 * Laravel module), and exposes MessageService + PermissionsGuard for
 * feature modules to inject / apply.
 *
 *   @Module({ imports: [CoreModule, MongooseModule.forRoot(...), BrandModule] })
 *   export class AppModule {}
 */
@Global()
@Module({
  providers: [
    MessageService,
    PermissionsGuard,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
  ],
  exports: [MessageService, PermissionsGuard],
})
export class CoreModule {}
