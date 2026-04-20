import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class ProviderQueryDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  available?: boolean;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;
}
