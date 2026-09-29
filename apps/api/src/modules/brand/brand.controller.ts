import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiListQuery, CurrentUser, ListQuery, Permissions, ResponseMessage, Serialize } from '@app/core';
import type { ParsedListQuery } from '@app/core';
import { BrandService } from './brand.service.js';
import { BrandResource } from './brand.resource.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { BRAND_SEARCHABLE_FIELDS } from './entities/brand.entity.js';

/**
 * Equivalent of Modules/Brand/app/Http/Controllers/BrandController.php +
 * routes/api.php's `Route::apiResource('brand', ...)->crudPermissions(...)`.
 * Served at /v1/brands via URI versioning (see app.setup.ts).
 *
 * Handlers just return data. The global pieces from @app/core do the rest:
 * JwtAuthGuard + PermissionsGuard check `@Permissions()`, @Serialize() shapes
 * output through BrandResource, @ResponseMessage() adds the `message`, and
 * AllExceptionsFilter turns any error into `{ message }`.
 */
@ApiTags('brands')
@ApiBearerAuth()
@Serialize(BrandResource)
@Controller({ path: 'brands', version: '1' })
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @Permissions('brand.read')
  @ResponseMessage('fetch-all-success')
  @ApiListQuery(BRAND_SEARCHABLE_FIELDS)
  index(@ListQuery() query: ParsedListQuery) {
    return this.brandService.index(query);
  }

  @Get(':id')
  @Permissions('brand.read')
  @ResponseMessage('fetch-success')
  show(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandService.show(id);
  }

  // Nest defaults POST to 201 Created, matching Response::HTTP_CREATED in the Laravel controller.
  @Post()
  @Permissions('brand.create')
  @ResponseMessage('create-success')
  store(@Body() dto: CreateBrandDto, @CurrentUser('id') userId: string) {
    return this.brandService.store(dto, userId);
  }

  @Put(':id')
  @Permissions('brand.update')
  @ResponseMessage('update-success')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto, @CurrentUser('id') userId: string) {
    return this.brandService.update(id, dto, userId);
  }

  @Delete(':id')
  @Permissions('brand.delete')
  @ResponseMessage('delete-success')
  destroy(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandService.destroy(id);
  }

  @Patch(':id/restore')
  @Permissions('brand.update')
  @ResponseMessage('restore-success')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandService.restore(id);
  }
}
