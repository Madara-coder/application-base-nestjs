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
ESM, `nest build` (rspack), Vitest, oxlint and Prettier. The API ships with JWT auth
and permission guards, Swagger docs, a health check, Helmet, CORS and rate limiting.

## Getting started

```bash
npm install
cp .env.example .env            # then point DB_* at your database and set JWT_SECRET
npm run migration:run           # create the tables
npm run start:dev

# every route needs a token - mint a local one with the permissions you need
TOKEN=$(npm run -s token -- brand.read brand.create brand.update brand.delete)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/v1/brands
```

Swagger UI is at http://localhost:3000/docs: click **Authorize** and paste the token.
The health check is at http://localhost:3000/health.

Requires Node 22.13+ and a Postgres, MySQL or MariaDB database. Postgres (`pg`) is
installed by default. For MySQL/MariaDB, `npm install mysql2` and set `DB_TYPE`.

## Scripts

| Script | What it does |
|--------|--------------|
| `start:dev` / `start:debug` | Run the API with watch mode (and the inspector) |
| `build` / `start:prod` | Bundle to `dist/apps/api/main.js` and run it |
| `test` / `test:watch` | Unit tests (`*.spec.ts`, next to the code they test), once or in watch mode |
| `test:cov` / `test:debug` | Unit tests with coverage / with the inspector attached |
| `test:e2e` | HTTP tests in `apps/api/test/` against an in-memory sql.js database built by the real migrations |
| `typecheck` | Type-check everything, specs included |
| `lint` / `format` | oxlint / Prettier |
| `migration:run` / `migration:revert` / `migration:show` | Apply, roll back or list migrations |
| `migration:generate --name=AddFooToBrands` | Diff the entities against the database and write a migration |
| `migration:create --name=Backfill` | Empty migration for hand-written changes |
| `typeorm -- <command>` | Any other TypeORM CLI command, against `data-source.ts` (e.g. `schema:log`) |
| `generate:module -- Category` | Scaffold a full CRUD module into `apps/api/src/modules/` |
| `token -- brand.read --sub u1 --ttl 2h` | Mint a local dev access token (refuses with `NODE_ENV=production`) |

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
  `vitest.config.e2e.ts`, so no `.env` or database is needed. Requests use real
  tokens signed by the app's `JwtService`, so the auth and permission guards are
  exercised too.
- `vitest.config.ts` enables legacy decorators + decorator metadata explicitly.
  Keep that setting: Nest DI and TypeORM depend on it.

## Project structure

```
apps/api/
├── src/
│   ├── main.ts                     Bootstrap
│   ├── app.module.ts               Config, TypeORM, JWT, throttler, global guards, feature modules
│   ├── app.setup.ts                Helmet, CORS, URI versioning, Swagger; shared with e2e tests
│   ├── config/                     app/auth/database registerAs() namespaces + env validation
│   ├── database/
│   │   ├── data-source.ts          DataSource for the TypeORM CLI
│   │   └── migrations/             Migrations + the index that registers them
│   └── modules/
│       ├── health/                 GET /health (Terminus, DB ping)
│       └── brand/                  Reference feature module
│           ├── entities/brand.entity.ts
│           ├── dto/                Create/Update DTOs (class-validator + Swagger)
│           ├── brand.repository.ts extends BaseRepository<Brand>
│           ├── brand.service.ts    extends BaseCrudService<Brand>
│           ├── brand.controller.ts @Serialize(BrandResource), returns data
│           ├── brand.resource.ts   extends BaseResource<Brand>
│           └── brand.module.ts
└── test/                           e2e specs

libs/core/src/
├── core.module.ts                  Global module: ValidationPipe, filter, interceptor, MessageService
├── index.ts                        Public API (import everything from '@app/core')
├── common/
│   ├── constants/  exceptions/  interfaces/  utils/
│   ├── decorators/                 @ListQuery @ApiListQuery @Permissions @Public @CurrentUser
│   │                               @ResponseMessage @Serialize
│   ├── filters/all-exceptions.filter.ts
│   ├── guards/                     JwtAuthGuard, PermissionsGuard
│   ├── interceptors/transform-response.interceptor.ts
│   └── responses/response-envelope.ts
├── controllers/base.controller.ts
├── database/core.entity.ts         CoreEntity: uuid id, timestamps, soft delete
├── i18n/message.service.ts
├── repositories/                   BaseRepository + IBaseRepository
├── resources/base.resource.ts
└── services/base-crud.service.ts

tools/generate-module.js            Module scaffolder
tools/issue-dev-token.js            Local dev token minter
```

## Configuration

Environment variables are validated at startup (`apps/api/src/config/env.validation.ts`),
and the app refuses to boot with a list of what's missing. Read config through
`ConfigService` or by injecting a namespace (`@Inject(databaseConfig.KEY)`), not
through `process.env` directly.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `production` or `test` |
| `PORT` | no | `3000` | HTTP port |
| `DB_TYPE` | **yes** | | `postgres`, `mysql`, `mariadb` (`sqljs` = in-memory, used by e2e) |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_NAME` | **yes**¹ | | Connection |
| `DB_PASSWORD` | no | | Connection |
| `DB_SYNCHRONIZE` | no | `false` | Auto-sync schema from entities. Throwaway local DBs only; use migrations |
| `DB_LOGGING` | no | `false` | Log SQL |
| `DB_MIGRATIONS_RUN` | no | `false` | Apply pending migrations on startup |
| `JWT_SECRET` | **yes** | | HS256 secret access tokens are verified with (32+ chars) |
| `JWT_ISSUER`, `JWT_AUDIENCE` | no | | Also require these `iss` / `aud` claims |
| `CORS_ORIGINS` | no | (disabled) | Comma-separated allowed origins |
| `SWAGGER_ENABLED` | no | on, except production | Serve `/docs` |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | no | `60000`, `100` | Rate limit: requests per window (ms) per client |

¹ Not needed when `DB_TYPE=sqljs`.

## Building a feature module

`npm run generate:module -- Category` writes all of these. Then add the module to
`AppModule` and generate its migration. The shape, using `brand` as the reference:

1. **Entity** (`entities/x.entity.ts`): extend `CoreEntity`, declare
   `@Entity('table_name')` and `@Column()`s, and export an `X_SEARCHABLE_FIELDS` array
   (the equivalent of `Brand::searchable()`). **Always give `@Column` an explicit `type`.**
   The migration CLI runs through `tsx`, which doesn't emit the decorator metadata
   TypeORM would otherwise infer it from.
2. **DTOs** (`dto/`): `class-validator` decorators, plus `@ApiProperty()` for Swagger.
   The update DTO is `PartialType(CreateXDto)` from `@nestjs/swagger`, so the docs carry over.
3. **Repository** (`x.repository.ts`): `extends BaseRepository<X>`. Inject
   `@InjectRepository(X) Repository<X>` + `EventEmitter2` and pass `X_SEARCHABLE_FIELDS`.
   Put custom queries here (`this.repository.createQueryBuilder(...)`).
4. **Resource** (`x.resource.ts`): `extends BaseResource<X>` and implement `toJSON()`.
   Never return a raw entity from a controller.
5. **Service** (`x.service.ts`): `extends BaseCrudService<X>`. An empty body gives plain
   CRUD. Override only the methods with real business logic.
6. **Controller** (`x.controller.ts`): `@Controller({ path: 'xs', version: '1' })` and
   `@Serialize(XResource)` on the class. On each route, add `@Permissions('x.action')` and
   `@ResponseMessage('create-success')`, then return what the service returns. Validate
   ids with `ParseUUIDPipe`, and document list routes with `@ApiListQuery(X_SEARCHABLE_FIELDS)`.
7. **Module** (`x.module.ts`): `TypeOrmModule.forFeature([X])` plus the
   controller/repository/service. Export the service if other modules need it.

ESM note: relative imports end in `.js` (`'./brand.service.js'`). Types used only in
decorated signatures are imported with `import type` (required by `isolatedModules`).

### Controllers: decorators or `BaseController`

The preferred style is the declarative one in `BrandController`. Handlers return data,
and `TransformResponseInterceptor` builds the `{ message, data }` envelope:

```ts
@Serialize(BrandResource)                      // every response goes through BrandResource
@Controller({ path: 'brands', version: '1' })
export class BrandController {
  @Post()
  @Permissions('brand.create')
  @ResponseMessage('create-success')           // → "Brand created successfully."
  store(@Body() dto: CreateBrandDto, @CurrentUser('id') userId: string) {
    return this.brandService.store(dto, userId);
  }
}
```

`@Serialize()` handles a single entity, an array, or a `PaginatedResult` (keeping its
`meta`). `@ResponseMessage()` takes `{ namespace, params }` for module-specific keys.

`BaseController` is still there for handlers that build their message at runtime,
e.g. with a count or a conditional key. Extend it and return
``this.success(this.lang('delete-success', { name: `${count} brands` }))``. The interceptor passes that
envelope through unchanged, so both styles can be mixed in one controller.

## Endpoints

| Method & path | Auth | Permission |
|---|---|---|
| `GET /v1/brands` (list: search, filter, sort, paginate) | token | `brand.read` |
| `GET /v1/brands/:id` | token | `brand.read` |
| `POST /v1/brands` | token | `brand.create` |
| `PUT /v1/brands/:id` | token | `brand.update` |
| `DELETE /v1/brands/:id` (soft delete) | token | `brand.delete` |
| `PATCH /v1/brands/:id/restore` | token | `brand.update` |
| `GET /health` | public | |
| `GET /docs`, `GET /docs-json` | public | |

Full request/response schemas are in Swagger at `/docs`.

## Request lifecycle (list endpoint)

```
GET /v1/brands?search=matte&sortBy=sortOrder&sortOrder=asc&__gte_sortOrder=2&page=2
Authorization: Bearer <token>
        │
        ▼
Global guards: ThrottlerGuard → JwtAuthGuard (sets request.user) → PermissionsGuard (brand.read)
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
TransformResponseInterceptor: @Serialize(BrandResource) shapes each entity,
@ResponseMessage('fetch-all-success') adds the message
        │
        ▼
{ "message": "List fetched successfully.", "data": { "data": [...], "meta": {...} } }
```

Errors at any step are caught once by `AllExceptionsFilter` and returned as
`{ message }`. That covers a missing/invalid token (401), a missing permission (403),
a failed DTO validation or non-UUID id (400), a unique or foreign-key violation (409),
a not-null violation (422), rate limiting (429), or anything unexpected (500, logged).

Only fields in `X_SEARCHABLE_FIELDS` can be searched, filtered or compared.
Comparison params on any other field are ignored.

## Soft delete

`CoreEntity.deletedAt` is a TypeORM `@DeleteDateColumn`, so every `find*()` skips
trashed rows automatically.

- Default: only live rows.
- `?withTrashed=true`: include soft-deleted rows.
- `?onlyTrashed=true`: only soft-deleted rows.
- `delete(id)` sets `deletedAt`. `restore(id)` and `bulkRestore(ids)` clear it.
- Over HTTP: `DELETE /v1/brands/:id` soft deletes and `PATCH /v1/brands/:id/restore`
  restores.

## Auth and permissions

Three global guards run on every request, in this order (`app.module.ts`):

1. **`ThrottlerGuard`**: `THROTTLE_LIMIT` requests per `THROTTLE_TTL` ms per client
   (429). Skip it with `@SkipThrottle()`.
2. **`JwtAuthGuard`** (`@app/core`): requires `Authorization: Bearer <token>`, verifies
   it with `JWT_SECRET` (HS256, plus `JWT_ISSUER`/`JWT_AUDIENCE` if set), and sets
   `request.user` to `{ id, permissions, ...claims }` (401 otherwise). Opt a route out
   with `@Public()`.
3. **`PermissionsGuard`** (`@app/core`): when a route has `@Permissions('brand.update')`,
   the token's `permissions` claim must include it (403 otherwise). Routes without
   `@Permissions()` only need a valid token.

Read the caller with `@CurrentUser()` (the whole `AuthUser`) or `@CurrentUser('id')`.

**Issuing tokens is not part of this API yet.** It verifies tokens but has no users or
login. Tokens are expected from an identity provider, or from a future `auth` module,
with a `sub` (user id) claim and a `permissions` array. For local work, use
`npm run token -- <permissions...>`.

## Platform

| Feature | Where | Config |
|---|---|---|
| Swagger UI / OpenAPI JSON | `/docs`, `/docs-json` | `SWAGGER_ENABLED` (default: on except in production) |
| Health check (DB ping) | `GET /health` (public, not versioned, not throttled) | none |
| Security headers | Helmet, `app.setup.ts` | none |
| CORS | `app.setup.ts` | `CORS_ORIGINS` (comma-separated; empty = disabled) |
| Rate limiting | `ThrottlerGuard` | `THROTTLE_TTL`, `THROTTLE_LIMIT` |

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| App exits with `Invalid environment configuration` | A required env var is missing or malformed (e.g. `JWT_SECRET` under 32 chars). Compare `.env` with `.env.example`. |
| Every request returns 401 | Send `Authorization: Bearer <token>`, signed with the same `JWT_SECRET` (`npm run token`). |
| 403 `Missing required permission: x.y` | The token's `permissions` claim lacks that string. Mint one that includes it. |
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
| `BaseController` + `ApiResponse` + `ExceptionHandler` | `@ResponseMessage()` + `@Serialize()` (or `BaseController#success()`) + `TransformResponseInterceptor` + `AllExceptionsFilter` | Response shaping and error handling are **global**, registered once by `CoreModule` |
| `BaseRequest` (store()/update() rule switch) | `CreateXDto` + `UpdateXDto extends PartialType(CreateXDto)` | |
| `BaseResource` + `CustomResource` + `ResourceRelationships` + `ResourceTimestamps` | `BaseResource<T>` | `make()`/`collection()`, `withTimestamps()`, `whenLoaded()`, `pick()` |
| `BasePolicy` (Spatie `{policyKey}.{action}`) | `PermissionsGuard` + `@Permissions('brand.update')` | Same permission-string convention, per route, read from the JWT's `permissions` claim |
| `auth:sanctum` middleware | `JwtAuthGuard` (global) + `@Public()` | Authenticated by default, opt out explicitly |
| `HasEvent` (`Event::dispatch("{table}.{key}")`) | `EventEmitter2` via `BaseRepository#emit()` | Same `"{table}.{event}.before/after"` naming |
| `ResponseMessage` (`lang()`, `lang/en/app.php`) | `MessageService#lang()` | Same keys and `:param` interpolation. Per-module overrides via `messages.register(namespace, {...})` |
| `Nullify` adapter | `nullify()` | Same recursive empty→null behavior |
| `MakeModuleCrudCommand` | `npm run generate:module` | `nest g resource` doesn't know about the base classes, hence the custom scaffolder |
