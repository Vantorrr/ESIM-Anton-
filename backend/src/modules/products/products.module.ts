import { Module, forwardRef } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { EsimProviderModule } from '../esim-provider/esim-provider.module';

@Module({
  imports: [forwardRef(() => EsimProviderModule)],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
