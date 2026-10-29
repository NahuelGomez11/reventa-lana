import { ConsultaMercado, ResultadoBusquedaMercado } from './contrato';

/** Token de inyeccion de la fuente de mercado (sustituible por una simulada en pruebas). */
export const FUENTE_MERCADO = Symbol('FUENTE_MERCADO');

/** Puerto que implementa cada fuente de precios (hoy, solo Mercado Libre). */
export interface FuenteMercadoBackend {
  buscar(consulta: ConsultaMercado): Promise<ResultadoBusquedaMercado>;
  obtenerItem(itemId: string): Promise<ResultadoBusquedaMercado>;
}
