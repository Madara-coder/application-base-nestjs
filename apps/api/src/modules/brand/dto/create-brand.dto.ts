import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

/**
 * Equivalent of Modules/Brand/app/Http/Requests/BrandRequest.php's rules().
 * Idiomatic Nest replaces the FormRequest store()/update() method-switch
 * with two DTOs: this one, and UpdateBrandDto = PartialType(CreateBrandDto)
 * (see update-brand.dto.ts). The global ValidationPipe (registered by
 * CoreModule, `whitelist: true`) validates it and strips unknown fields.
 * The @ApiProperty decorators feed the Swagger docs at /docs.
 */
export class CreateBrandDto {
  @ApiProperty({ maxLength: 255, example: 'Matte Co' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ maxLength: 255, example: 'matte-co', description: 'Unique; stored lowercase.' })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  logo?: string;

  @ApiPropertyOptional({ maxLength: 255, format: 'uri', example: 'https://example.com' })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
