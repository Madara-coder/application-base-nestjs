import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Brand, BrandSchema } from './schemas/brand.schema';
import { BrandRepository } from './brand.repository';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';

/**
 * Equivalent of Brand's BrandServiceProvider + RepositoryServiceProvider +
 * RouteServiceProvider combined - Nest's module system binds
 * repository/service/controller together directly, so there's no separate
 * "bind interface to concrete class" provider file to maintain.
 *
 * Wire it into AppModule:
 *   @Module({ imports: [CoreModule, MongooseModule.forRoot(uri), BrandModule] })
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }])],
  controllers: [BrandController],
  providers: [BrandRepository, BrandService],
  exports: [BrandService],
})
export class BrandModule {}
