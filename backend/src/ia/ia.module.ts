import { Module } from '@nestjs/common';
import { HTTP_FETCH } from '../mercado/http';
import { GeminiIaProvider } from './adapters/gemini.ia';
import { IA_CONFIG, leerConfigIa } from './ia.config';
import { IaController } from './ia.controller';
import { IA_PROVIDER } from './ia.port';
import { IaService } from './ia.service';

/**
 * Modulo de resumen con IA. Configuracion por entorno (`IA_PROVEEDOR`, `GEMINI_API_KEY`).
 * Por defecto desactivado: la app funciona sin IA y en estado honesto.
 * La API key nunca sale del backend.
 */
@Module({
  controllers: [IaController],
  providers: [
    { provide: IA_CONFIG, useFactory: () => leerConfigIa() },
    { provide: HTTP_FETCH, useValue: (input: string, init?: RequestInit) => fetch(input, init) },
    { provide: IA_PROVIDER, useClass: GeminiIaProvider },
    IaService,
  ],
})
export class IaModule {}
