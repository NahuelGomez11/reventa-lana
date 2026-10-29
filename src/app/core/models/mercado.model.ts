import { Moneda } from './analisis.model';
import { CondicionProducto } from './producto.model';

/** Fuentes de precios externas soportadas. Hoy solo Mercado Libre (vía backend propio). */
export type FuenteMercadoId = 'mercadolibre';

/**
 * Estado de una búsqueda de mercado. Se usa para informar con precisión qué pasó,
 * sin presentar resultados vacíos como si fueran precios reales.
 */
export type EstadoBusquedaMercado =
  | 'ok'
  | 'sin_resultados'
  | 'insuficiente'
  | 'no_configurado'
  | 'no_disponible'
  | 'limite'
  | 'error';

export interface EnvioPublicacion {
  tipo: 'gratis' | 'pago' | 'desconocido';
  /** Costo de envío informado por la fuente. null = no informado (no significa 0). */
  costo: number | null;
}

/** Publicación externa normalizada a un formato propio (no es el JSON crudo de la fuente). */
export interface PublicacionMercado {
  id: string;
  fuente: FuenteMercadoId;
  /** Id de la publicación en la fuente (ej. MLA123456789). */
  itemId: string | null;
  /** Id de producto de catálogo en la fuente, si aplica. */
  productId: string | null;
  titulo: string;
  precio: number;
  moneda: Moneda;
  url: string | null;
  vendedor: string | null;
  condicion: CondicionProducto;
  envio: EnvioPublicacion;
  disponible: boolean;
  /** Fecha en que la fuente informó este dato (ISO). */
  consultadoEn: string;
}

export interface ConsultaMercado {
  q: string;
  /** Site id de la fuente (ej. MLA). */
  siteId: string;
  marca?: string | null;
  modelo?: string | null;
  limite?: number;
}

export interface ResultadoBusquedaMercado {
  estado: EstadoBusquedaMercado;
  fuente: FuenteMercadoId | null;
  publicaciones: PublicacionMercado[];
  /** Total de coincidencias informado por la fuente (puede superar las publicaciones devueltas). */
  total: number;
  consultadoEn: string;
  /** Explicación legible para el usuario cuando no hay resultados utilizables. */
  mensaje: string | null;
}
