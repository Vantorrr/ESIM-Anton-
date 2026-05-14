import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type {
  CheckoutPaymentMethod,
  CreateTopupOrderRequest,
} from '@shared/contracts/checkout';

const CHECKOUT_PAYMENT_METHODS: CheckoutPaymentMethod[] = ['card', 'balance'];

export class CreateTopupOrderDto implements CreateTopupOrderRequest {
  @IsString()
  @MaxLength(128)
  packageCode: string;

  @IsOptional()
  @IsIn(CHECKOUT_PAYMENT_METHODS)
  paymentMethod?: CheckoutPaymentMethod;
}
