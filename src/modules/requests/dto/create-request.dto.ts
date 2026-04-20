import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsOptional()
  @IsString()
  city?: string;
}
