import 'dotenv/config';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import databaseConfig from '../config/database.config.js';

/**
 * DataSource for the TypeORM CLI (`npm run migration:*`). Reuses the app's
 * database config so the CLI and the running app always point at the same
 * database; the only difference is that the CLI can't use autoLoadEntities,
 * so it globs entity files instead.
 */
export default new DataSource({
  ...databaseConfig(),
  entities: ['apps/api/src/**/*.entity.ts'],
} as DataSourceOptions);
