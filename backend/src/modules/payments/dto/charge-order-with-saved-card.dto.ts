import { IsString } from 'class-validator';
import type { ChargeOrderWithSavedCardRequest } from '@shared/contracts/checkout';

export class ChargeOrderWithSavedCardDto implements ChargeOrderWithSavedCardRequest {
  @IsString()
  orderId: string;
}
