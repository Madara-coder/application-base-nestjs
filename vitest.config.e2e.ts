import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['apps/**/test/**/*.e2e-spec.ts'],
    // e2e tests run against a throwaway in-memory database, built by the real
    // migrations (not synchronize) so the migrations themselves are tested too.
    env: {
      NODE_ENV: 'test',
      DB_TYPE: 'sqljs',
      DB_SYNCHRONIZE: 'false',
      DB_MIGRATIONS_RUN: 'true',
      JWT_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e',
      SWAGGER_ENABLED: 'true',
    },
  },
});
