import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class UpdateProviderDto {
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsInt() @Min(0) @Max(50) experience?: number;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() zone?: string;
  @IsOptional() @IsBoolean() available?: boolean;
}
