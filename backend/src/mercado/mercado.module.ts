import { Module } from '@nestjs/common';
import { MERCADO_CONFIG, leerConfigMercado } from '../config/mercado.config';
import { MercadoLibreFuente } from './adapters/mercadolibre.fuente';
import { FUENTE_MERCADO } from './fuente-mercado.port';
import { HTTP_FETCH } from './http';
import { LimiteConsultasGuard } from './limite-consultas.guard';
import { MercadoController } from './mercado.controller';
import { MercadoService } from './mercado.service';
import { TokenService } from './oauth/token.service';

/**
 * Modulo de integracion de mercado. Configuracion por variables de entorno
 * (`src/config/mercado.config.ts`). Los secretos nunca salen del backend.
 */
@Module({
  controllers: [MercadoController],
  providers: [
    { provide: MERCADO_CONFIG, useFactory: () => leerConfigMercado() },
    { provide: HTTP_FETCH, useValue: (input: string, init?: RequestInit) => fetch(input, init) },
    { provide: FUENTE_MERCADO, useClass: MercadoLibreFuente },
    TokenService,
    MercadoService,
    LimiteConsultasGuard,
  ],
})
export class MercadoModule {}
