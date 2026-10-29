import { DatosAnalisis } from '../../core/models/analisis.model';
import { diferenciaPorcentualVsMediana } from '../market/market-stats';
import { construirAnalisisInput } from './construir-analisis';
import { calcularFinanzas, ResultadoFinanciero } from './financial.service';

export interface FilaSimulacion {
  precioVenta: number;
  valido: boolean;
  resultado: ResultadoFinanciero | null;
  diferenciaVsMedianaPct: number | null;
  faltantes: string[];
  motivo: string | null;
}

/**
 * Simula precios de venta sobre los MISMOS supuestos del análisis,
 * sin modificar el producto original. Reutiliza el motor financiero:
 * no duplica fórmulas.
 */
export function simularPrecios(
  datos: DatosAnalisis,
  precios: number[],
  mediana: number | null,
): FilaSimulacion[] {
  const base = construirAnalisisInput(datos);

  return precios.map((precioVenta) => {
    if (!Number.isFinite(precioVenta) || precioVenta <= 0) {
      return {
        precioVenta,
        valido: false,
        resultado: null,
        diferenciaVsMedianaPct: null,
        faltantes: base.ok ? [] : base.faltantes,
        motivo: 'Precio de venta inválido (debe ser mayor a 0).',
      };
    }
    if (!base.ok) {
      return {
        precioVenta,
        valido: false,
        resultado: null,
        diferenciaVsMedianaPct: null,
        faltantes: base.faltantes,
        motivo: 'Faltan datos del análisis para simular.',
      };
    }
    const input: typeof base.input = {
      ...base.input,
      costosVenta: { ...base.input.costosVenta, precioVentaObjetivo: precioVenta },
    };
    return {
      precioVenta,
      valido: true,
      resultado: calcularFinanzas(input),
      diferenciaVsMedianaPct: diferenciaPorcentualVsMediana(precioVenta, mediana),
      faltantes: [],
      motivo: null,
    };
  });
}

/**
 * Propuestas iniciales de precios a simular, derivadas del precio objetivo
 * y de la mediana del mercado. No inventa precios: si no hay datos, no propone.
 */
export function preciosSugeridos(
  precioObjetivo: number | null,
  mediana: number | null,
): number[] {
  const candidatos: number[] = [];
  if (precioObjetivo != null && Number.isFinite(precioObjetivo) && precioObjetivo > 0) {
    candidatos.push(precioObjetivo);
  }
  if (mediana != null && Number.isFinite(mediana) && mediana > 0) {
    candidatos.push(mediana * 0.9, mediana, mediana * 1.1);
  }
  const redondeados = candidatos
    .map((c) => Math.round(c))
    .filter((c) => c > 0)
    .filter((c, i, arr) => arr.findIndex((x) => Math.abs(x - c) <= 1) === i);
  return redondeados.slice(0, 4);
}
