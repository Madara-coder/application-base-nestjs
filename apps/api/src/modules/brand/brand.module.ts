import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from './entities/brand.entity.js';
import { BrandRepository } from './brand.repository.js';
import { BrandService } from './brand.service.js';
import { BrandController } from './brand.controller.js';

/**
 * Equivalent of Brand's BrandServiceProvider + RepositoryServiceProvider +
 * RouteServiceProvider combined - Nest's module system binds
 * repository/service/controller together directly, so there's no separate
 * "bind interface to concrete class" provider file to maintain.
 *
 * Registered in AppModule's imports.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Brand])],
  controllers: [BrandController],
  providers: [BrandRepository, BrandService],
  exports: [BrandService],
})
export class BrandModule {}
