import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from '@app/core';
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { BrandModule } from './modules/brand/brand.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>) => db,
    }),
    EventEmitterModule.forRoot(), // powers BaseRepository's lifecycle events
    CoreModule, // global validation pipe, exception filter, response envelope, MessageService, PermissionsGuard
    BrandModule,
  ],
})
export class AppModule {}
