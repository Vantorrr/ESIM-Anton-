import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { CreateOrderQuoteRequest } from '@shared/contracts/checkout';

export class CreateOrderQuoteDto implements CreateOrderQuoteRequest {
  @IsString()
  productId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  useBonuses?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodNum?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  promoCode?: string;
}
