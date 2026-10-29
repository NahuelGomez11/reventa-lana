import { Inject, Injectable } from '@nestjs/common';
import { MERCADO_CONFIG, MercadoConfig } from '../config/mercado.config';
import { ConsultaMercado, ResultadoBusquedaMercado } from './contrato';
import { FUENTE_MERCADO, FuenteMercadoBackend } from './fuente-mercado.port';

/**
 * Orquesta la busqueda de mercado: normaliza la consulta y aplica los limites
 * configurados. No conoce HTTP ni credenciales: delega en la fuente.
 */
@Injectable()
export class MercadoService {
  constructor(
    @Inject(FUENTE_MERCADO) private readonly fuente: FuenteMercadoBackend,
    @Inject(MERCADO_CONFIG) private readonly config: MercadoConfig,
  ) {}

  async buscar(consulta: ConsultaMercado): Promise<ResultadoBusquedaMercado> {
    const q = consulta.q.trim();
    const pedido = Number.isFinite(consulta.limite) ? Math.trunc(consulta.limite) : this.config.maxResultados;
    const limite = Math.min(Math.max(1, pedido), this.config.maxResultados);
    return this.fuente.buscar({ ...consulta, q, limite });
  }

  async obtenerItem(itemId: string): Promise<ResultadoBusquedaMercado> {
    return this.fuente.obtenerItem(itemId.trim());
  }
}
