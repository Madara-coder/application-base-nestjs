import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

/**
 * Equivalent of Modules/Brand/app/Http/Requests/BrandRequest.php's rules().
 * Idiomatic Nest replaces the FormRequest store()/update() method-switch
 * with two DTOs: this one, and UpdateBrandDto = PartialType(CreateBrandDto)
 * (see update-brand.dto.ts) - the ValidationPipe + `whitelist: true` handles
 * the rest (see README "Validation" section for the global pipe setup).
 */
export class CreateBrandDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  logo?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
