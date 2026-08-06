# @cosmetic/nestjs-core

A reusable, repository-pattern "core" for NestJS + MongoDB services — the MERN-stack
counterpart to `Modules/Core` in this repo's Laravel codebase. It exists so that every
new NestJS module (Brand, Category, Attribute, Unit, ...) gets full CRUD, filtering,
pagination, soft delete, a consistent response envelope, and consistent error handling
for free, the same way every Laravel module gets it by extending `BaseRepository`,
`BaseController`, etc.

This is a **library, not a runnable app**. Copy this folder into (or install it as a
local package inside) your NestJS backend, then build feature modules against it —
see [`example/brand`](./example/brand) for a complete, working example modeled directly
on `Modules/Brand`.

## Why this exists

The Laravel side of this project standardized on the repository pattern specifically so
that:

1. Every module gets CRUD + filtering/search/sort/pagination without rewriting it.
2. Controllers stay thin — no query building, no manual error-shape juggling.
3. Cross-cutting concerns (response envelope, exception mapping, permissions) live in
   one place instead of being copy-pasted per module.

The NestJS version keeps that contract, but isn't a mechanical line-for-line port —
where Nest's own idioms (dependency injection, global filters/interceptors, DTOs +
`class-validator`, `PartialType`) already solve a problem better than the Laravel
pattern did, this library uses those instead. Every file below has a comment pointing
back at the Laravel file it replaces and calling out where/why the approach changed.

## What's inside

```
nestjs-core/
├── src/
│   ├── core.module.ts                  Global module — import once in AppModule
│   ├── database/base.schema.ts         BaseSchema (timestamps + soft delete)
│   ├── repositories/
│   │   ├── base-repository.interface.ts
│   │   └── base.repository.ts          Generic CRUD + filter/search/sort/paginate
│   ├── services/base-crud.service.ts   Generic index/store/show/update/destroy
│   ├── controllers/base.controller.ts  success()/lang()/toResource() helpers
│   ├── resources/base.resource.ts      Serializer base (BaseResource → toJSON())
│   ├── filters/all-exceptions.filter.ts  Global error→JSON mapping
│   ├── interceptors/transform-response.interceptor.ts  Global {message,data} envelope
│   ├── guards/permissions.guard.ts     @Permissions() route guard
│   ├── i18n/message.service.ts         lang() message lookup w/ per-module overrides
│   └── common/                         DTO-less query parsing, decorators, exceptions, utils
├── example/brand/                      Full worked example (Mongo port of Modules/Brand)
└── tools/generate-module.js            Scaffolds a new module (schema/dto/repo/svc/ctrl)
```

## Laravel → NestJS mapping

| Laravel (`Modules/Core`)                          | NestJS (`nestjs-core`)                                    | Notes |
|----------------------------------------------------|-------------------------------------------------------------|-------|
| `BaseRepository` + `BaseRepositoryInterface`        | `BaseRepository<T>` + `IBaseRepository<T>`                  | Same method set (`fetchAll`→`findAll`, `fetch`→`findById`, `store`→`create`, ...), Mongoose instead of Eloquent |
| `Filterable` trait                                  | `parseListQuery()` + `BaseRepository`'s private `buildFilter()` | `?search=`, `filter[]`, `__gte_x` comparison params, sort, pagination — same query contract |
| `BaseModel` + `HasSearchable` + `HasFillable`       | `BaseSchema` + a `SEARCHABLE_FIELDS` const per schema        | `getFillable()` has no equivalent — DTOs + `class-validator` are the allow-list, enforced at the edge instead of on the model |
| `BaseService` + `HasBinding`                        | `BaseCrudService<T>`                                         | `HasBinding`'s macro/factory-swap is dropped — Nest's DI (`{ provide, useClass }`) already does conditional-implementation swapping |
| `BaseController` + `ApiResponse` + `ExceptionHandler` | `BaseController` (thin) + `TransformResponseInterceptor` + `AllExceptionsFilter` | Response shaping and error handling move to **global**, one-time-registered filter/interceptor instead of being mixed into every controller |
| `BaseRequest` (store()/update() rule switch)        | Two DTOs: `CreateXDto` + `UpdateXDto extends PartialType(CreateXDto)` | Standard Nest pattern; no method-based branching needed |
| `BaseResource` + `CustomResource` + `ResourceRelationships` + `ResourceTimestamps` | `BaseResource<T>` | `make()`/`collection()`, `withTimestamps()`, `whenPopulated()`, `pick()` |
| `BasePolicy` (Spatie `{policyKey}.{action}`)        | `PermissionsGuard` + `@Permissions('brand.update')`           | Same permission-string convention, applied per-route instead of via policy class resolution |
| `HasEvent` (`Event::dispatch("{table}.{key}")`)     | `EventEmitter2` via `BaseRepository#emit()`                   | Same `"{collection}.{event}.before/after"` naming |
| `ResponseMessage` (`lang()`, `lang/en/app.php`)     | `MessageService#lang()`                                       | Same key set & `:param` interpolation; register per-module overrides via `messages.register(namespace, {...})` |
| `Nullify` adapter                                   | `nullify()` util                                               | Same recursive empty→null behavior |
| `MakeModuleCrudCommand` (`module:make-supersonic-crud`) | `tools/generate-module.js`                                | Zero-dependency Node scaffolder — no Nest CLI schematic plugin required |

## Installing it into a NestJS app

This package is framework glue, not a database driver — install its peers alongside it:

```bash
npm install @nestjs/common @nestjs/core @nestjs/mongoose mongoose \
            @nestjs/event-emitter @nestjs/mapped-types \
            class-validator class-transformer reflect-metadata rxjs
```

Then either:

- **Monorepo / npm workspace**: add `"nestjs-core": "workspace:*"` (or a `file:` path) to
  your backend's `package.json`, or
- **Standalone**: copy `src/` into your app as `src/core/` and import from `../core`
  instead of `@cosmetic/nestjs-core`.

Either way, run `npm run build` here first if you're consuming the compiled `dist/`
output rather than the TypeScript source directly.

## Assembling `AppModule`

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // whitelist: true strips unknown DTO fields (the class-validator equivalent
  // of Laravel's $fillable allow-list). Comparison-operator query params
  // (__gte_price) bypass this entirely - they're read via @ListQuery(),
  // never through a validated DTO. See common/utils/query-parser.util.ts.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(3000);
}
bootstrap();
```

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoreModule } from '@cosmetic/nestjs-core';
import { BrandModule } from './modules/brand/brand.module';

@Module({
  imports: [
    CoreModule,                       // global filter/interceptor/MessageService/PermissionsGuard
    EventEmitterModule.forRoot(),      // powers BaseRepository's lifecycle events
    MongooseModule.forRoot(process.env.MONGO_URI),
    BrandModule,
  ],
})
export class AppModule {}
```

`CoreModule` is `@Global()` — import it exactly once, at the root. It registers:

- `AllExceptionsFilter` as `APP_FILTER` (every uncaught error → `{ message }` JSON,
  status-code mapped)
- `TransformResponseInterceptor` as `APP_INTERCEPTOR` (every response → `{ message?, data? }`
  envelope)
- `MessageService` and `PermissionsGuard`, exported for feature modules to inject / apply

## Building a feature module

`example/brand/` is a complete worked example — a Mongo/Nest port of `Modules/Brand`.
The shape to copy for a new entity:

1. **Schema** (`schemas/x.schema.ts`) — extend `BaseSchema`, declare `@Schema({ timestamps: true })`,
   export a `X_SEARCHABLE_FIELDS` array (equivalent of `Brand::searchable()`).
2. **DTOs** (`dto/create-x.dto.ts`, `dto/update-x.dto.ts`) — `class-validator` decorators;
   update DTO is `PartialType(CreateXDto)`.
3. **Repository** (`x.repository.ts`) — `extends BaseRepository<XDocument>`, inject the
   Mongoose model + `EventEmitter2`, pass `X_SEARCHABLE_FIELDS`. Add custom queries here.
4. **Resource** (`x.resource.ts`) — `extends BaseResource<XDocument>`, implement `toJSON()`.
   Never return a raw Mongoose document from a controller.
5. **Service** (`x.service.ts`) — `extends BaseCrudService<XDocument>`. Empty body = plain
   CRUD; override only the method(s) with real business logic.
6. **Controller** (`x.controller.ts`) — `extends BaseController`, one method per route,
   `@Permissions('x.action')` per route, call `this.success(this.lang(key), payload)`.
7. **Module** (`x.module.ts`) — `MongooseModule.forFeature([...])` + wire
   controller/repository/service together; export the service if other modules need it.

Or scaffold all seven files in one shot:

```bash
node tools/generate-module.js Category
# writes ./generated/category/... — copy into src/modules/category, wire into AppModule
```

## Request lifecycle (list endpoint example)

```
GET /v1/brands?search=matte&sortOrder=asc&__gte_sortOrder=2&page=2
        │
        ▼
@ListQuery() decorator → parseListQuery(req.query) → ParsedListQuery
        │
        ▼
BrandController#index() → BrandService#index() (inherited) → BrandRepository#findAll()
        │
        ▼
buildFilter() turns ParsedListQuery into a Mongo filter (deletedAt scope + $or search
+ filter[] + __gte_/__like_/... comparison operators), applies sort + skip/limit
        │
        ▼
BrandResource.collection(result.data) shapes the documents for the wire
        │
        ▼
controller returns this.success(message, { data, meta })
        │
        ▼
TransformResponseInterceptor passes the envelope through unchanged
        │
        ▼
{ "message": "List fetched successfully.", "data": { "data": [...], "meta": {...} } }
```

Errors at any step (thrown `HttpException`, a Mongoose `CastError`/`ValidationError`, a
duplicate-key `11000`, or anything unexpected) are caught once by `AllExceptionsFilter`
and turned into the same `{ message }` shape Laravel's `ExceptionHandler` trait produces.

## Soft delete

Mongoose has no built-in soft delete, so `BaseSchema` adds a `deletedAt: Date | null`
field and `BaseRepository` scopes every read by it:

- Default: only `deletedAt: null` documents are returned.
- `?withTrashed=true`: include soft-deleted documents too.
- `?onlyTrashed=true`: only soft-deleted documents.
- `delete(id)` sets `deletedAt`; `restore(id)`/`bulkRestore(ids)` clear it back to `null`.

## Deliberate departures from the Laravel version

- **No `HasBinding`/macro system.** Nest's constructor DI (`{ provide: X, useClass: Y }`,
  or a factory provider keyed off a condition) already covers "swap the concrete
  implementation" — a bespoke macro/factory trait would just be reimplementing DI on top
  of DI.
- **No `BaseRequest` method-switch.** Two DTOs (`CreateXDto` / `UpdateXDto extends
  PartialType(CreateXDto)`) is the idiomatic Nest shape and reads better than branching
  on HTTP verb inside one class.
- **Response shaping and error handling are global, not per-controller.** Laravel's
  `BaseController` mixes in `ApiResponse` + `ExceptionHandler` per class; Nest's
  filter/interceptor pipeline lets `CoreModule` register both exactly once for the whole
  app, so `BaseController` itself stays down to `success()`/`lang()`/`toResource()`.
- **`fillable` has no equivalent.** Mass-assignment protection happens at the DTO layer
  (`class-validator` + `whitelist: true`) instead of on the model, since that's where
  Nest already validates the request boundary.
