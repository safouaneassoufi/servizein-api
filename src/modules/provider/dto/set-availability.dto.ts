import { IsArray, IsBoolean, IsInt, IsOptional, IsString, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilityRuleDto {
  @IsInt() @Min(0) @Max(6) dayOfWeek: number;
  @IsBoolean() isOff: boolean;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() endTime?: string;
}

export class SetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityRuleDto)
  rules: AvailabilityRuleDto[];
}
