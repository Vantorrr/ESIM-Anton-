import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EsimProviderService } from './esim-provider.service';
import { EsimProviderController } from './esim-provider.controller';
import { EsimWebhookService } from './esim-webhook.service';
import { EsimWebhookGuard } from './esim-webhook.guard';
import { EsimWebhookReplayService } from './esim-webhook-replay.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ProductsModule),
  ],
  controllers: [EsimProviderController],
  providers: [EsimProviderService, EsimWebhookService, EsimWebhookReplayService, EsimWebhookGuard],
  exports: [EsimProviderService],
})
export class EsimProviderModule {}
