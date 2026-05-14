import { IsIn, IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';
import type { CreateOrderRequest, CheckoutPaymentMethod } from '@shared/contracts/checkout';
import { CreateOrderQuoteDto } from './create-order-quote.dto';

const CHECKOUT_PAYMENT_METHODS: CheckoutPaymentMethod[] = ['card', 'balance'];

export class CreateOrderDto
  extends CreateOrderQuoteDto
  implements CreateOrderRequest
{
  @IsOptional()
  @IsIn(CHECKOUT_PAYMENT_METHODS)
  paymentMethod?: CheckoutPaymentMethod;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
