/**
 * Contrato de respuesta del backend de mercado.
 * DEBE coincidir con lo que espera el frontend Angular en
 * `src/app/data/adapters/fuente-mercado-http.ts` (`parsearRespuestaMercado`).
 * No agregar/quitar campos sin actualizar ambos lados y `docs/INTEGRACION_MERCADO.md`.
 */

export type FuenteMercadoId = 'mercadolibre';

export type EstadoBusquedaMercado =
  | 'ok'
  | 'sin_resultados'
  | 'insuficiente'
  | 'no_configurado'
  | 'no_disponible'
  | 'limite'
  | 'error';

export type CondicionMercado = 'nuevo' | 'usado' | 'reacondicionado' | 'desconocida';
export type MonedaMercado = 'ARS' | 'USD';

export interface EnvioPublicacion {
  tipo: 'gratis' | 'pago' | 'desconocido';
  /** Costo informado por la fuente. null = no informado (nunca se asume 0). */
  costo: number | null;
}

export interface PublicacionMercado {
  id: string;
  fuente: FuenteMercadoId;
  itemId: string | null;
  productId: string | null;
  titulo: string;
  precio: number;
  moneda: MonedaMercado;
  url: string | null;
  vendedor: string | null;
  condicion: CondicionMercado;
  envio: EnvioPublicacion;
  disponible: boolean;
  consultadoEn: string;
}

export interface ConsultaMercado {
  q: string;
  siteId: string;
  limite: number;
  marca?: string | null;
  modelo?: string | null;
}

export interface ResultadoBusquedaMercado {
  estado: EstadoBusquedaMercado;
  fuente: FuenteMercadoId | null;
  publicaciones: PublicacionMercado[];
  total: number;
  consultadoEn: string;
  mensaje: string | null;
}
