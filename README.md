# nestjs-core

A NestJS + TypeORM monorepo with two projects:

- **`libs/core`** (`@app/core`): a reusable, repository-pattern core. It is the
  NestJS counterpart of `Modules/Core` in the Laravel codebase. Every feature module
  gets CRUD, filtering, pagination, soft delete, a consistent response envelope and
  consistent error handling for free, the same way every Laravel module does by
  extending `BaseRepository`, `BaseController` and friends.
- **`apps/api`**: the runnable API built on it, with config, database, migrations
  and feature modules (`brand` is the reference module, ported from `Modules/Brand`).

The layout follows the standard Nest CLI monorepo (`nest new` + `nest g library`):
ESM, `nest build` (rspack), Vitest, oxlint and Prettier.

## Getting started

```bash
npm install
cp .env.example .env            # then point DB_* at your database
npm run migration:run           # create the tables
npm run start:dev               # http://localhost:3000/v1/brands
```

Requires Node 22.13+ and a Postgres, MySQL or MariaDB database. Postgres (`pg`) is
installed by default. For MySQL/MariaDB, `npm install mysql2` and set `DB_TYPE`.

## Scripts

| Script | What it does |
|--------|--------------|
| `start:dev` / `start:debug` | Run the API with watch mode (and the inspector) |
| `build` / `start:prod` | Bundle to `dist/apps/api/main.js` and run it |
| `test` | Unit tests (`*.spec.ts`, next to the code they test) |
| `test:e2e` | HTTP tests in `apps/api/test/` against an in-memory sql.js database built by the real migrations |
| `typecheck` | Type-check everything, specs included |
| `lint` / `format` | oxlint / Prettier |
| `migration:run` / `migration:revert` / `migration:show` | Apply, roll back or list migrations |
| `migration:generate --name=AddFooToBrands` | Diff the entities against the database and write a migration |
| `migration:create --name=Backfill` | Empty migration for hand-written changes |
| `generate:module -- Category` | Scaffold a full CRUD module into `apps/api/src/modules/` |

## Migrations

A typical schema change:

```bash
# 1. change an entity, then diff it against the database in .env
npm run migration:generate --name=AddCountryToBrands
# 2. register the new class in apps/api/src/database/migrations/index.ts
# 3. apply it
npm run migration:run
```

- **Register every migration** in `apps/api/src/database/migrations/index.ts`. The app
  is bundled into one file, so there's no migrations folder to glob at runtime.
- `migration:generate` writes SQL for the database you point it at. Generate against
  the same kind of database you deploy to. `CreateBrandsTable` is hand-written with
  TypeORM's `Table` API instead, so it runs on every supported driver, including
  the e2e tests' sql.js.
- The CLI loads `apps/api/src/database/data-source.ts`, which reuses the app's
  database config and reads `.env`.

## Testing

- **Unit tests** (`npm test`) sit next to the code as `*.spec.ts`. Library specs
  (e.g. `base.repository.spec.ts`) run against an in-memory sql.js database. App specs
  use `Test.createTestingModule()` with mocked repositories.
- **e2e tests** (`npm run test:e2e`) live in `apps/api/test/`. They boot the real
  `AppModule` via `setupApp()` against in-memory sql.js with `DB_MIGRATIONS_RUN=true`,
  so every run also checks the migrations. The env for this is set in
  `vitest.config.e2e.ts`, so no `.env` or database is needed.
- `vitest.config.ts` enables legacy decorators + decorator metadata explicitly.
  Keep that setting: Nest DI and TypeORM depend on it.

## Project structure

```
apps/api/
├── src/
│   ├── main.ts                     Bootstrap
│   ├── app.module.ts               Config, TypeORM, EventEmitter, CoreModule, feature modules
│   ├── app.setup.ts                URI versioning + shutdown hooks, shared with e2e tests
│   ├── config/                     registerAs() config namespaces + env validation
│   ├── database/
│   │   ├── data-source.ts          DataSource for the TypeORM CLI
│   │   └── migrations/             Migrations + the index that registers them
│   └── modules/brand/              Reference feature module
│       ├── entities/brand.entity.ts
│       ├── dto/                    Create/Update DTOs (class-validator)
│       ├── brand.repository.ts     extends BaseRepository<Brand>
│       ├── brand.service.ts        extends BaseCrudService<Brand>
│       ├── brand.controller.ts     extends BaseController
│       ├── brand.resource.ts       extends BaseResource<Brand>
│       └── brand.module.ts
└── test/                           e2e specs

libs/core/src/
├── core.module.ts                  Global module: ValidationPipe, filter, interceptor, MessageService, PermissionsGuard
├── index.ts                        Public API (import everything from '@app/core')
├── common/
│   ├── constants/  decorators/  exceptions/  interfaces/  utils/
│   ├── filters/all-exceptions.filter.ts
│   ├── guards/permissions.guard.ts
│   └── interceptors/transform-response.interceptor.ts
├── controllers/base.controller.ts
├── database/core.entity.ts         CoreEntity: uuid id, timestamps, soft delete
├── i18n/message.service.ts
├── repositories/                   BaseRepository + IBaseRepository
├── resources/base.resource.ts
└── services/base-crud.service.ts

tools/generate-module.js            Module scaffolder
```

## Configuration

Environment variables are validated at startup (`apps/api/src/config/env.validation.ts`),
and the app refuses to boot with a list of what's missing. See `.env.example` for
every variable. Read config through `ConfigService` or by injecting a namespace
(`@Inject(databaseConfig.KEY)`), not through `process.env` directly.

`DB_SYNCHRONIZE` should stay `false` anywhere but a throwaway local database. Use
migrations instead. `DB_MIGRATIONS_RUN=true` applies pending migrations on startup.

## Building a feature module

`npm run generate:module -- Category` writes all of these. Then add the module to
`AppModule` and generate its migration. The shape, using `brand` as the reference:

1. **Entity** (`entities/x.entity.ts`): extend `CoreEntity`, declare
   `@Entity('table_name')` and `@Column()`s, and export an `X_SEARCHABLE_FIELDS` array
   (the equivalent of `Brand::searchable()`). **Always give `@Column` an explicit `type`.**
   The migration CLI runs through `tsx`, which doesn't emit the decorator metadata
   TypeORM would otherwise infer it from.
2. **DTOs** (`dto/`): `class-validator` decorators. The update DTO is `PartialType(CreateXDto)`.
3. **Repository** (`x.repository.ts`): `extends BaseRepository<X>`. Inject
   `@InjectRepository(X) Repository<X>` + `EventEmitter2` and pass `X_SEARCHABLE_FIELDS`.
   Put custom queries here (`this.repository.createQueryBuilder(...)`).
4. **Resource** (`x.resource.ts`): `extends BaseResource<X>` and implement `toJSON()`.
   Never return a raw entity from a controller.
5. **Service** (`x.service.ts`): `extends BaseCrudService<X>`. An empty body gives plain
   CRUD. Override only the methods with real business logic.
6. **Controller** (`x.controller.ts`): `@Controller({ path: 'xs', version: '1' })`,
   `extends BaseController`, `@Permissions('x.action')` per route, and return
   `this.success(this.lang(key), payload)`.
7. **Module** (`x.module.ts`): `TypeOrmModule.forFeature([X])` plus the
   controller/repository/service. Export the service if other modules need it.

ESM note: relative imports end in `.js` (`'./brand.service.js'`). Types used only in
decorated signatures are imported with `import type` (required by `isolatedModules`).

## Request lifecycle (list endpoint)

```
GET /v1/brands?search=matte&sortBy=sortOrder&sortOrder=asc&__gte_sortOrder=2&page=2
        │
        ▼
@ListQuery() → parseListQuery(req.query) → ParsedListQuery
        │
        ▼
BrandController#index() → BrandService#index() (inherited) → BrandRepository#findAll()
        │
        ▼
buildListQuery() turns ParsedListQuery into a TypeORM QueryBuilder: soft-delete scope,
OR'd LIKE search, filter[], __gte_/__like_/... comparisons (all bound parameters),
sort validated against the entity's columns, skip/take
        │
        ▼
BrandResource.collection(result.data) shapes the entities for the wire
        │
        ▼
{ "message": "List fetched successfully.", "data": { "data": [...], "meta": {...} } }
```

Errors at any step are caught once by `AllExceptionsFilter` and returned as
`{ message }`. That covers a thrown `HttpException`, a failed DTO validation (400), a
unique or foreign-key violation (409), a not-null violation (422), a malformed id
(400), or anything unexpected (500, logged).

Only fields in `X_SEARCHABLE_FIELDS` can be searched, filtered or compared.
Comparison params on any other field are ignored.

## Soft delete

`CoreEntity.deletedAt` is a TypeORM `@DeleteDateColumn`, so every `find*()` skips
trashed rows automatically.

- Default: only live rows.
- `?withTrashed=true`: include soft-deleted rows.
- `?onlyTrashed=true`: only soft-deleted rows.
- `delete(id)` sets `deletedAt`. `restore(id)` and `bulkRestore(ids)` clear it.

## Auth

There is no auth module yet. `PermissionsGuard` checks `request.user.permissions`
against the route's `@Permissions(...)`, so until an auth guard/strategy (e.g.
`@nestjs/passport` + JWT) populates `request.user`, the Brand routes return 403.
`apps/api/test/brand.e2e-spec.ts` shows how a user is attached.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| App exits with `Invalid environment configuration` | A required env var is missing or malformed. Compare `.env` with `.env.example`. |
| `Cannot find module './foo'` at runtime | ESM needs the extension: `import ... from './foo.js'`. |
| `A type referenced in a decorated signature must be imported with 'import type'` | Use `import type { X }` for interfaces used in decorated method params. |
| Migration CLI: `Data type "Object" ... is not supported` or column type errors | Add an explicit `type` to that `@Column`. |
| Vitest: `SyntaxError: Invalid or unexpected token` in a file with decorators | The `oxc.decorator` setting was removed from `vitest.config.ts`. Restore it. |
| `npm install <pkg>` crashes with `Cannot read properties of null (reading 'edgesOut')` | An npm 10 dependency-resolution bug with the Vitest peer graph. Use `npx npm@11 install <pkg>`. Plain `npm ci` / `npm install` from the lockfile work fine on npm 10. |

## Laravel → NestJS mapping

| Laravel (`Modules/Core`) | NestJS (`@app/core`) | Notes |
|---|---|---|
| `BaseRepository` + `BaseRepositoryInterface` | `BaseRepository<T>` + `IBaseRepository<T>` | Same method set (`fetchAll`→`findAll`, `fetch`→`findById`, `store`→`create`, ...), TypeORM instead of Eloquent |
| `Filterable` trait | `parseListQuery()` + `BaseRepository#buildListQuery()` | `?search=`, `filter[]`, `__gte_x` comparison params, sort, pagination: same query contract |
| `BaseModel` + `HasSearchable` + `HasFillable` | `CoreEntity` + a `SEARCHABLE_FIELDS` const per entity | `getFillable()` has no equivalent. DTOs + `whitelist: true` are the allow-list, enforced at the edge |
| `with()` eager loading | `relations` arg (`['category', 'category.parent']`) | |
| `BaseService` + `HasBinding` | `BaseCrudService<T>` | Nest's DI (`{ provide, useClass }`) replaces the macro/factory swap |
| `BaseController` + `ApiResponse` + `ExceptionHandler` | `BaseController` (thin) + `TransformResponseInterceptor` + `AllExceptionsFilter` | Response shaping and error handling are **global**, registered once by `CoreModule` |
| `BaseRequest` (store()/update() rule switch) | `CreateXDto` + `UpdateXDto extends PartialType(CreateXDto)` | |
| `BaseResource` + `CustomResource` + `ResourceRelationships` + `ResourceTimestamps` | `BaseResource<T>` | `make()`/`collection()`, `withTimestamps()`, `whenLoaded()`, `pick()` |
| `BasePolicy` (Spatie `{policyKey}.{action}`) | `PermissionsGuard` + `@Permissions('brand.update')` | Same permission-string convention, per route |
| `HasEvent` (`Event::dispatch("{table}.{key}")`) | `EventEmitter2` via `BaseRepository#emit()` | Same `"{table}.{event}.before/after"` naming |
| `ResponseMessage` (`lang()`, `lang/en/app.php`) | `MessageService#lang()` | Same keys and `:param` interpolation. Per-module overrides via `messages.register(namespace, {...})` |
| `Nullify` adapter | `nullify()` | Same recursive empty→null behavior |
| `MakeModuleCrudCommand` | `npm run generate:module` | `nest g resource` doesn't know about the base classes, hence the custom scaffolder |
