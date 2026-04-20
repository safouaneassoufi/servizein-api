import { IsString, IsNotEmpty } from 'class-validator';

export class UploadUrlDto {
  @IsString()
  @IsNotEmpty()
  folder: string; // avatars | documents | gallery | services

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;
}
