import { IsString } from 'class-validator';
import type { CreatePaymentRequest } from '@shared/contracts/checkout';

export class CreatePaymentDto implements CreatePaymentRequest {
  @IsString()
  orderId: string;
}
