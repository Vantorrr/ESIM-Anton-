import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';
import type {
  BalanceTopupProvider,
  CreateBalanceTopupRequest,
} from '@shared/contracts/checkout';

const BALANCE_TOPUP_PROVIDERS: BalanceTopupProvider[] = [
  'cloudpayments',
  'robokassa',
];

export class CreateBalanceTopupDto implements CreateBalanceTopupRequest {
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(100000)
  amount: number;

  @IsOptional()
  @IsIn(BALANCE_TOPUP_PROVIDERS)
  provider?: BalanceTopupProvider;
}
