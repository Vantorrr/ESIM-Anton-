import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EsimProviderService } from './esim-provider.service';
import { EsimProviderController } from './esim-provider.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ConfigModule, forwardRef(() => ProductsModule)],
  controllers: [EsimProviderController],
  providers: [EsimProviderService],
  exports: [EsimProviderService],
})
export class EsimProviderModule {}
