#!/usr/bin/env node
/**
 * Zero-dependency scaffold generator, equivalent of
 * Modules/Core/app/Console/Commands/MakeModuleCrudCommand.php
 * (`php artisan module:make-supersonic-crud`).
 *
 * Generates a schema, create/update DTOs, repository, resource, service,
 * controller and module for a new entity, wired against @cosmetic/nestjs-core,
 * following the same shape as example/brand/.
 *
 * Usage:
 *   node tools/generate-module.js Brand
 *   node tools/generate-module.js ProductCategory --out ../api/src/modules
 */
const fs = require('fs');
const path = require('path');

function toPascalCase(input) {
  return input
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
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
  const outDir = outFlagIndex !== -1 ? args[outFlagIndex + 1] : path.join(__dirname, '..', 'generated');
  const nameArg = args.find((arg) => !arg.startsWith('--') && arg !== outDir);

  if (!nameArg) {
    console.error('Usage: node tools/generate-module.js <EntityName> [--out <dir>] [--force]');
    process.exit(1);
  }

  const Pascal = toPascalCase(nameArg);
  const camel = toCamelCase(nameArg);
  const kebab = toKebabCase(nameArg);
  const kebabPlural = pluralize(kebab);
  const routePrefix = `v1/${kebabPlural}`;
  const permissionKey = kebab.replace(/-/g, '_');
  const eventCollection = pluralize(camel);

  const moduleDir = path.join(outDir, kebab);

  const files = {
    [`schemas/${kebab}.schema.ts`]: `import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from '@cosmetic/nestjs-core';

export type ${Pascal}Document = HydratedDocument<${Pascal}>;

@Schema({ timestamps: true })
export class ${Pascal} extends BaseSchema {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string;
}

export const ${Pascal}Schema = SchemaFactory.createForClass(${Pascal});

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
import { Create${Pascal}Dto } from './create-${kebab}.dto';

export class Update${Pascal}Dto extends PartialType(Create${Pascal}Dto) {}
`,

    [`${kebab}.repository.ts`]: `import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseRepository } from '@cosmetic/nestjs-core';
import { ${Pascal}, ${Pascal}Document, ${Pascal.toUpperCase()}_SEARCHABLE_FIELDS } from './schemas/${kebab}.schema';

@Injectable()
export class ${Pascal}Repository extends BaseRepository<${Pascal}Document> {
  constructor(@InjectModel(${Pascal}.name) ${camel}Model: Model<${Pascal}Document>, eventEmitter: EventEmitter2) {
    super(${camel}Model, ${Pascal.toUpperCase()}_SEARCHABLE_FIELDS, eventEmitter);
  }
}
`,

    [`${kebab}.resource.ts`]: `import { BaseResource } from '@cosmetic/nestjs-core';
import { ${Pascal}Document } from './schemas/${kebab}.schema';

export class ${Pascal}Resource extends BaseResource<${Pascal}Document> {
  toJSON() {
    return this.withTimestamps({
      id: this.entity._id,
      name: this.entity.name,
      slug: this.entity.slug,
    });
  }
}
`,

    [`${kebab}.service.ts`]: `import { Injectable } from '@nestjs/common';
import { BaseCrudService } from '@cosmetic/nestjs-core';
import { ${Pascal}Document } from './schemas/${kebab}.schema';
import { ${Pascal}Repository } from './${kebab}.repository';

@Injectable()
export class ${Pascal}Service extends BaseCrudService<${Pascal}Document> {
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
  ParsedListQuery,
  Permissions,
  PermissionsGuard,
  isPaginatedResult,
} from '@cosmetic/nestjs-core';
import { ${Pascal}Service } from './${kebab}.service';
import { ${Pascal}Resource } from './${kebab}.resource';
import { Create${Pascal}Dto } from './dto/create-${kebab}.dto';
import { Update${Pascal}Dto } from './dto/update-${kebab}.dto';

@Controller('${routePrefix}')
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
import { MongooseModule } from '@nestjs/mongoose';
import { ${Pascal}, ${Pascal}Schema } from './schemas/${kebab}.schema';
import { ${Pascal}Repository } from './${kebab}.repository';
import { ${Pascal}Service } from './${kebab}.service';
import { ${Pascal}Controller } from './${kebab}.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: ${Pascal}.name, schema: ${Pascal}Schema }])],
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

  console.log(`\nDone. Events for this module will emit under the "${eventCollection}.*" prefix.`);
  console.log(`Remember to import ${Pascal}Module into AppModule.`);
}

main();
