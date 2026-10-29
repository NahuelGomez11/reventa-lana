import { Inject, Injectable } from '@nestjs/common';
import { PublicacionMercado } from '../mercado/contrato';
import { IA_CONFIG, IaConfig } from './ia.config';
import { EntradaResumen, IA_PROVIDER, IaProvider, PublicacionParaResumen, ResumenIa } from './ia.port';

/** Convierte una publicacion de mercado al formato que consume la capa IA. */
export function aPublicacionParaResumen(p: PublicacionMercado): PublicacionParaResumen {
  return {
    id: p.id,
    titulo: p.titulo,
    precio: p.precio,
    moneda: p.moneda,
    url: p.url,
    vendedor: p.vendedor,
    condicion: p.condicion,
  };
}

/**
 * Orquesta el resumen con IA. Recibe publicaciones que ya trajo una fuente real
 * (con URL) y delega en el proveedor. La IA nunca calcula finanzas ni recibe credenciales.
 */
@Injectable()
export class IaService {
  constructor(
    @Inject(IA_PROVIDER) private readonly proveedor: IaProvider,
    @Inject(IA_CONFIG) private readonly config: IaConfig,
  ) {}

  get configurada(): boolean {
    return this.config.proveedor !== 'ninguno' && this.proveedor.configurada;
  }

  async resumir(consulta: string, publicaciones: PublicacionParaResumen[]): Promise<ResumenIa> {
    const entrada: EntradaResumen = { consulta, publicaciones };
    return this.proveedor.resumir(entrada);
  }

  async resumirPublicaciones(consulta: string, publicaciones: PublicacionMercado[]): Promise<ResumenIa> {
    return this.resumir(consulta, publicaciones.map(aPublicacionParaResumen));
  }
}
