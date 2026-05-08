import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class UpsertLoyaltyLevelDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsNumber()
  @Min(0)
  minSpent: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  cashbackPercent: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  discount: number;
}
