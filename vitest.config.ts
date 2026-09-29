import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the @app/core path alias declared in tsconfig.json.
  resolve: { tsconfigPaths: true },
  // Nest and TypeORM need legacy decorators + design:type metadata. Set here
  // rather than inferred from tsconfig, because not every spec file is part
  // of a tsconfig project (lib specs are excluded from the app build).
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  test: {
    globals: true,
    root: './',
    include: ['{apps,libs}/**/src/**/*.spec.ts'],
  },
});
