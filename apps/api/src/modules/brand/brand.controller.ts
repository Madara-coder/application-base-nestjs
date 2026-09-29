import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  BaseController,
  CurrentUser,
  ListQuery,
  MessageService,
  Permissions,
  PermissionsGuard,
  isPaginatedResult,
} from '@app/core';
import type { ParsedListQuery } from '@app/core';
import { BrandService } from './brand.service.js';
import { BrandResource } from './brand.resource.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';

/**
 * Equivalent of Modules/Brand/app/Http/Controllers/BrandController.php +
 * routes/api.php's `Route::apiResource('brand', ...)->crudPermissions(...)`.
 * Served at /v1/brands via URI versioning (see app.setup.ts).
 * No try/catch/handleException() per action - AllExceptionsFilter (global,
 * from CoreModule) does that; `@Permissions()` + PermissionsGuard replaces
 * the `->crudPermissions('brand')` route macro + BasePolicy.
 */
@Controller({ path: 'brands', version: '1' })
@UseGuards(PermissionsGuard)
export class BrandController extends BaseController {
  constructor(
    private readonly brandService: BrandService,
    messages: MessageService,
  ) {
    super(messages);
  }

  @Get()
  @Permissions('brand.read')
  async index(@ListQuery() query: ParsedListQuery) {
    const result = await this.brandService.index(query);
    const data = isPaginatedResult(result)
      ? { ...result, data: BrandResource.collection(result.data) }
      : BrandResource.collection(result as unknown[]);

    return this.success(this.lang('fetch-all-success'), data);
  }

  @Get(':id')
  @Permissions('brand.read')
  async show(@Param('id') id: string) {
    const brand = await this.brandService.show(id);
    return this.success(this.lang('fetch-success'), this.toResource(BrandResource, brand));
  }

  // Nest defaults POST to 201 Created, matching Response::HTTP_CREATED in the Laravel controller.
  @Post()
  @Permissions('brand.create')
  async store(@Body() dto: CreateBrandDto, @CurrentUser('id') userId: string) {
    const brand = await this.brandService.store(dto, userId);
    return this.success(this.lang('create-success'), this.toResource(BrandResource, brand));
  }

  @Put(':id')
  @Permissions('brand.update')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto, @CurrentUser('id') userId: string) {
    const brand = await this.brandService.update(id, dto, userId);
    return this.success(this.lang('update-success'), this.toResource(BrandResource, brand));
  }

  @Delete(':id')
  @Permissions('brand.delete')
  async destroy(@Param('id') id: string) {
    await this.brandService.destroy(id);
    return this.success(this.lang('delete-success'));
  }
}
