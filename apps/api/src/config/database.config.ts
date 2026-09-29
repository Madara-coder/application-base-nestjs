import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MIGRATIONS } from '../database/migrations/index.js';

export type DatabaseType = 'postgres' | 'mysql' | 'mariadb' | 'sqljs';

/**
 * TypeORM connection options, read from env (validated by env.validation.ts).
 * `sqljs` is an in-memory database used by the e2e tests - it needs no
 * server, so every connection field below is ignored for it.
 */
export default registerAs('database', (): TypeOrmModuleOptions => {
  const type = (process.env.DB_TYPE ?? 'postgres') as DatabaseType;

  const common = {
    autoLoadEntities: true,
    // Never synchronize outside local dev - it can drop columns. Use migrations.
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    migrations: MIGRATIONS,
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  };

  if (type === 'sqljs') {
    return { ...common, type };
  }

  return {
    ...common,
    type,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
});
