import { Module } from '@nestjs/common';
import { IaModule } from './ia/ia.module';
import { MercadoModule } from './mercado/mercado.module';

@Module({
  imports: [MercadoModule, IaModule],
})
export class AppModule {}
