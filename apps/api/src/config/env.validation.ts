import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';
import type { DatabaseType } from './database.config.js';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const DATABASE_TYPES: DatabaseType[] = ['postgres', 'mysql', 'mariadb', 'sqljs'];

class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV?: Environment;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(65535)
  PORT?: number;

  @IsIn(DATABASE_TYPES)
  DB_TYPE: DatabaseType;

  @ValidateIf((env: EnvironmentVariables) => env.DB_TYPE !== 'sqljs')
  @IsString()
  DB_HOST: string;

  @ValidateIf((env: EnvironmentVariables) => env.DB_TYPE !== 'sqljs')
  @IsInt()
  @Min(0)
  @Max(65535)
  DB_PORT: number;

  @ValidateIf((env: EnvironmentVariables) => env.DB_TYPE !== 'sqljs')
  @IsString()
  DB_USERNAME: string;

  @IsOptional()
  @IsString()
  DB_PASSWORD?: string;

  @ValidateIf((env: EnvironmentVariables) => env.DB_TYPE !== 'sqljs')
  @IsString()
  DB_NAME: string;

  @IsOptional()
  @IsBooleanString()
  DB_SYNCHRONIZE?: string;

  @IsOptional()
  @IsBooleanString()
  DB_LOGGING?: string;

  @IsOptional()
  @IsBooleanString()
  DB_MIGRATIONS_RUN?: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ISSUER?: string;

  @IsOptional()
  @IsString()
  JWT_AUDIENCE?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsBooleanString()
  SWAGGER_ENABLED?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_TTL?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT?: number;
}

/** Fails app startup with a readable message when required env vars are missing or malformed. */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
    throw new Error(`Invalid environment configuration:\n- ${messages.join('\n- ')}`);
  }

  return config;
}
