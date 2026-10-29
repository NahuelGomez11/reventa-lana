import {
  ConsultaMercado,
  FuenteMercadoId,
  ResultadoBusquedaMercado,
} from '../../core/models/mercado.model';
import { ahoraIso } from '../../core/utils/id';

/**
 * Puerto de una fuente de precios de mercado (ej. Mercado Libre vía backend propio).
 * El dominio no conoce HTTP ni credenciales: solo este contrato.
 */
export interface FuenteMercado {
  readonly id: FuenteMercadoId;
  readonly nombre: string;
  /** true cuando la fuente está lista para consultarse (endpoint/credenciales configurados). */
  readonly configurada: boolean;
  buscar(consulta: ConsultaMercado): Promise<ResultadoBusquedaMercado>;
  /** Trae una publicación a partir de su identificador (ej. MLA123456789). */
  obtenerItem(itemId: string): Promise<ResultadoBusquedaMercado>;
}

/** Resultado explícito de "no hay fuente configurada". Nunca datos ficticios. */
export function resultadoNoConfigurado(): ResultadoBusquedaMercado {
  return {
    estado: 'no_configurado',
    fuente: null,
    publicaciones: [],
    total: 0,
    consultadoEn: ahoraIso(),
    mensaje:
      'La búsqueda automática de precios no está configurada todavía. Cargá observaciones manuales o configurá la fuente de mercado.',
  };
}
