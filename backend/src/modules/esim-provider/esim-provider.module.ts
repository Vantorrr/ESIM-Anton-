import { Module } from '@nestjs/common';
import { EsimProviderService } from './esim-provider.service';
import { EsimProviderController } from './esim-provider.controller';

@Module({
  controllers: [EsimProviderController],
  providers: [EsimProviderService],
  exports: [EsimProviderService],
})
export class EsimProviderModule {}
