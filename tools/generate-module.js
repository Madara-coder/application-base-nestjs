#!/usr/bin/env node
/**
 * Zero-dependency scaffold generator, equivalent of
 * Modules/Core/app/Console/Commands/MakeModuleCrudCommand.php
 * (`php artisan module:make-supersonic-crud`).
 *
 * Generates a TypeORM entity, create/update DTOs, repository, resource, service,
 * controller and module for a new entity, wired against @app/core, following
 * the same shape as apps/api/src/modules/brand/. (`nest g resource` only
 * scaffolds a plain controller/service pair, so it doesn't know about
 * BaseRepository/BaseCrudService/BaseResource.)
 *
 * Usage:
 *   npm run generate:module -- Brand
 *   npm run generate:module -- ProductCategory --out apps/api/src/modules --force
 */
import fs from 'node:fs';
import path from 'node:path';

function toPascalCase(input) {
  return input.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^(.)/, (c) => c.toUpperCase());
}

function toCamelCase(input) {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function pluralize(word) {
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return /[sxz]$|[sc]h$/i.test(word) ? `${word}es` : `${word}s`;
}

function writeFile(filePath, contents, force) {
  if (fs.existsSync(filePath) && !force) {
    console.log(`skip (exists): ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
  console.log(`created: ${filePath}`);
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const outFlagIndex = args.indexOf('--out');
  const outDir =
    outFlagIndex !== -1
      ? args[outFlagIndex + 1]
      : path.join(import.meta.dirname, '..', 'apps', 'api', 'src', 'modules');
  const nameArg = args.find((arg) => !arg.startsWith('--') && arg !== outDir);

  if (!nameArg) {
    console.error('Usage: node tools/generate-module.js <EntityName> [--out <dir>] [--force]');
    process.exit(1);
  }

  const Pascal = toPascalCase(nameArg);
  const camel = toCamelCase(nameArg);
  const kebab = toKebabCase(nameArg);
  const kebabPlural = pluralize(kebab);
  const routePath = kebabPlural;
  const permissionKey = kebab.replace(/-/g, '_');
  const tableName = pluralize(kebab).replace(/-/g, '_');

  const moduleDir = path.join(outDir, kebab);

  const files = {
    [`entities/${kebab}.entity.ts`]: `import { Column, Entity } from 'typeorm';
import { CoreEntity } from '@app/core';

// Always give @Column an explicit type: the migration CLI runs through tsx,
// which doesn't emit the decorator metadata TypeORM would otherwise infer it from.
@Entity('${tableName}')
export class ${Pascal} extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;
}

export const ${Pascal.toUpperCase()}_SEARCHABLE_FIELDS = ['name', 'slug'];
`,

    [`dto/create-${kebab}.dto.ts`]: `import { IsOptional, IsString, MaxLength } from 'class-validator';

export class Create${Pascal}Dto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;
}
`,

    [`dto/update-${kebab}.dto.ts`]: `import { PartialType } from '@nestjs/mapped-types';
import { Create${Pascal}Dto } from './create-${kebab}.dto.js';

export class Update${Pascal}Dto extends PartialType(Create${Pascal}Dto) {}
`,

    [`${kebab}.repository.ts`]: `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseRepository } from '@app/core';
import { ${Pascal}, ${Pascal.toUpperCase()}_SEARCHABLE_FIELDS } from './entities/${kebab}.entity.js';

@Injectable()
export class ${Pascal}Repository extends BaseRepository<${Pascal}> {
  constructor(@InjectRepository(${Pascal}) ${camel}Repository: Repository<${Pascal}>, eventEmitter: EventEmitter2) {
    super(${camel}Repository, ${Pascal.toUpperCase()}_SEARCHABLE_FIELDS, eventEmitter);
  }
}
`,

    [`${kebab}.resource.ts`]: `import { BaseResource } from '@app/core';
import { ${Pascal} } from './entities/${kebab}.entity.js';

export class ${Pascal}Resource extends BaseResource<${Pascal}> {
  toJSON() {
    return this.withTimestamps({
      id: this.entity.id,
      name: this.entity.name,
      slug: this.entity.slug,
    });
  }
}
`,

    [`${kebab}.service.ts`]: `import { Injectable } from '@nestjs/common';
import { BaseCrudService } from '@app/core';
import { ${Pascal} } from './entities/${kebab}.entity.js';
import { ${Pascal}Repository } from './${kebab}.repository.js';

@Injectable()
export class ${Pascal}Service extends BaseCrudService<${Pascal}> {
  constructor(private readonly ${camel}Repository: ${Pascal}Repository) {
    super(${camel}Repository);
  }
}
`,

    [`${kebab}.controller.ts`]: `import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  BaseController,
  ListQuery,
  MessageService,
  Permissions,
  PermissionsGuard,
  isPaginatedResult,
} from '@app/core';
import type { ParsedListQuery } from '@app/core';
import { ${Pascal}Service } from './${kebab}.service.js';
import { ${Pascal}Resource } from './${kebab}.resource.js';
import { Create${Pascal}Dto } from './dto/create-${kebab}.dto.js';
import { Update${Pascal}Dto } from './dto/update-${kebab}.dto.js';

@Controller({ path: '${routePath}', version: '1' })
@UseGuards(PermissionsGuard)
export class ${Pascal}Controller extends BaseController {
  constructor(private readonly ${camel}Service: ${Pascal}Service, messages: MessageService) {
    super(messages);
  }

  @Get()
  @Permissions('${permissionKey}.read')
  async index(@ListQuery() query: ParsedListQuery) {
    const result = await this.${camel}Service.index(query);
    const data = isPaginatedResult(result)
      ? { ...result, data: ${Pascal}Resource.collection(result.data) }
      : ${Pascal}Resource.collection(result as unknown[]);

    return this.success(this.lang('fetch-all-success'), data);
  }

  @Get(':id')
  @Permissions('${permissionKey}.read')
  async show(@Param('id') id: string) {
    const ${camel} = await this.${camel}Service.show(id);
    return this.success(this.lang('fetch-success'), this.toResource(${Pascal}Resource, ${camel}));
  }

  @Post()
  @Permissions('${permissionKey}.create')
  async store(@Body() dto: Create${Pascal}Dto) {
    const ${camel} = await this.${camel}Service.store(dto);
    return this.success(this.lang('create-success'), this.toResource(${Pascal}Resource, ${camel}));
  }

  @Put(':id')
  @Permissions('${permissionKey}.update')
  async update(@Param('id') id: string, @Body() dto: Update${Pascal}Dto) {
    const ${camel} = await this.${camel}Service.update(id, dto);
    return this.success(this.lang('update-success'), this.toResource(${Pascal}Resource, ${camel}));
  }

  @Delete(':id')
  @Permissions('${permissionKey}.delete')
  async destroy(@Param('id') id: string) {
    await this.${camel}Service.destroy(id);
    return this.success(this.lang('delete-success'));
  }
}
`,

    [`${kebab}.module.ts`]: `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${Pascal} } from './entities/${kebab}.entity.js';
import { ${Pascal}Repository } from './${kebab}.repository.js';
import { ${Pascal}Service } from './${kebab}.service.js';
import { ${Pascal}Controller } from './${kebab}.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([${Pascal}])],
  controllers: [${Pascal}Controller],
  providers: [${Pascal}Repository, ${Pascal}Service],
  exports: [${Pascal}Service],
})
export class ${Pascal}Module {}
`,
  };

  for (const [relativePath, contents] of Object.entries(files)) {
    writeFile(path.join(moduleDir, relativePath), contents, force);
  }

  console.log(`\nDone. Table "${tableName}"; events for this module will emit under the "${tableName}.*" prefix.`);
  console.log('Next steps:');
  console.log(`  1. Add ${Pascal}Module to AppModule's imports (apps/api/src/app.module.ts).`);
  console.log(
    `  2. npm run migration:generate --name=Create${Pascal}Table, then add it to database/migrations/index.ts.`,
  );
}

main();
