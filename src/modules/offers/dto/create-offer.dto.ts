import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateOfferDto {
  @IsString() @IsNotEmpty() requestId: string;
  @IsNumber() @Min(1) price: number;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsDateString() proposedDate?: string;
  @IsOptional() @IsString() proposedSlot?: string;
  @IsOptional() @IsNumber() @Min(0.5) estimatedHours?: number;
  @IsOptional() @IsDateString() validUntil?: string;
}
