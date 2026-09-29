import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule, JwtAuthGuard, PermissionsGuard } from '@app/core';
import appConfig from './config/app.config.js';
import authConfig from './config/auth.config.js';
import databaseConfig from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { BrandModule } from './modules/brand/brand.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, authConfig, databaseConfig],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>) => db,
    }),
    JwtModule.registerAsync({
      global: true, // JwtAuthGuard (from @app/core) injects JwtService
      inject: [authConfig.KEY],
      useFactory: (auth: ConfigType<typeof authConfig>) => ({
        secret: auth.jwtSecret,
        verifyOptions: { algorithms: ['HS256'], issuer: auth.jwtIssuer, audience: auth.jwtAudience },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (app: ConfigType<typeof appConfig>) => [{ ttl: app.throttle.ttl, limit: app.throttle.limit }],
    }),
    EventEmitterModule.forRoot(), // powers BaseRepository's lifecycle events
    CoreModule, // global validation pipe, exception filter, response envelope, MessageService
    HealthModule,
    BrandModule,
  ],
  providers: [
    // Global guards run in this order: rate limit -> authenticate -> authorize.
    // Every route requires a valid token unless marked @Public(); routes with
    // @Permissions(...) additionally require those permissions.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
