import { Moneda } from './analisis.model';

/**
 * Umbrales de riesgo. Son supuestos configurables del usuario,
 * no predicciones ni probabilidades de venta.
 */
export interface UmbralesRiesgo {
  /** Margen neto mínimo aceptable (%) para considerar rentable un análisis. */
  margenMinimoPct: number;
  /** % máximo del capital disponible que se compromete en una inversión. */
  capitalComprometidoMaxPct: number;
  /** Desviación (%) del precio propio frente a la mediana del mercado que se considera "fuera de mercado". */
  desviacionPrecioMercadoPct: number;
  /** Mínimo de observaciones de mercado para considerar suficiente la información. */
  minObservacionesMercado: number;
}

export interface Configuracion {
  capitalDisponible: number | null;
  moneda: Moneda;
  umbrales: UmbralesRiesgo;
}

export const UMBRALES_DEFECTO: UmbralesRiesgo = {
  margenMinimoPct: 15,
  capitalComprometidoMaxPct: 70,
  desviacionPrecioMercadoPct: 15,
  minObservacionesMercado: 3,
};

export const CONFIGURACION_DEFECTO: Configuracion = {
  capitalDisponible: null,
  moneda: 'ARS',
  umbrales: { ...UMBRALES_DEFECTO },
};
