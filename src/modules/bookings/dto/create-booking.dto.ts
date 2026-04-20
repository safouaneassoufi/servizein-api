import { IsString, IsNotEmpty, IsOptional, IsDateString, Matches } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsDateString()
  scheduledDate: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'scheduledSlot must be HH:mm' })
  scheduledSlot: string;

  @IsString()
  @IsOptional()
  clientNote?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
