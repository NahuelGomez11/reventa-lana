import { AnalisisProducto } from '../domain/analysis/analisis-producto';

export type TonoMarcador = 'propio' | 'mercado' | 'costo' | 'equilibrio';

export interface Marcador {
  id: string;
  etiqueta: string;
  valor: number;
  tono: TonoMarcador;
  /** Alterna la etiqueta arriba/abajo de la barra para que no se pisen. */
  arriba: boolean;
}

export interface EscalaPrecios {
  /** Rango de precios que se vieron en el mercado (null si no hay muestra válida). */
  banda: { min: number; max: number } | null;
  marcadores: Marcador[];
  /** Límites de la escala visual (incluyen todos los valores con margen). */
  desde: number;
  hasta: number;
}

/**
 * Arma la escala visual comparando el precio propio con el mercado, el costo y el
 * punto de equilibrio. Solo presenta valores ya calculados: no recalcula nada.
 * Devuelve null si no hay ningún valor que mostrar.
 */
export function construirEscala(
  analisis: AnalisisProducto,
  precioPropio: number | null,
): EscalaPrecios | null {
  const e = analisis.estadisticas;
  const banda = e.minimo != null && e.maximo != null ? { min: e.minimo, max: e.maximo } : null;

  const candidatos: Omit<Marcador, 'arriba'>[] = [];
  if (precioPropio != null && Number.isFinite(precioPropio) && precioPropio > 0) {
    candidatos.push({ id: 'propio', etiqueta: 'Tu precio', valor: precioPropio, tono: 'propio' });
  }
  if (e.mediana != null) {
    candidatos.push({ id: 'mediana', etiqueta: 'Mediana del mercado', valor: e.mediana, tono: 'mercado' });
  }
  const costo = analisis.resultado?.costoAdquisicionUnitarioEfectivo;
  if (costo != null && Number.isFinite(costo) && costo > 0) {
    candidatos.push({ id: 'costo', etiqueta: 'Costo por unidad', valor: costo, tono: 'costo' });
  }
  const equilibrio = analisis.resultado?.precioMinimoRentable;
  if (equilibrio != null && Number.isFinite(equilibrio) && equilibrio > 0) {
    candidatos.push({ id: 'equilibrio', etiqueta: 'Mínimo para no perder', valor: equilibrio, tono: 'equilibrio' });
  }

  const valores = [...candidatos.map((c) => c.valor), ...(banda ? [banda.min, banda.max] : [])];
  if (valores.length === 0) return null;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const margen = Math.max((max - min) * 0.1, 1);

  return {
    banda,
    marcadores: candidatos.map((c, i) => ({ ...c, arriba: i % 2 === 0 })),
    desde: Math.max(0, min - margen),
    hasta: max + margen,
  };
}

/** Posición en porcentaje (0-100) de un valor dentro de la escala. */
export function posicionEnEscala(valor: number, desde: number, hasta: number): number {
  const rango = hasta - desde;
  if (!Number.isFinite(valor) || rango <= 0) return 0;
  return Math.min(100, Math.max(0, ((valor - desde) / rango) * 100));
}

/**
 * Frase corta para decidir: dónde queda tu precio frente a la mediana del mercado.
 * Devuelve null si no hay mediana o precio propio.
 */
export function fraseVsMercado(diferenciaPct: number | null): string | null {
  if (diferenciaPct == null || !Number.isFinite(diferenciaPct)) return null;
  const redondeado = Math.round(Math.abs(diferenciaPct));
  if (redondeado === 0) return 'Tu precio está igual que la mediana del mercado.';
  return diferenciaPct > 0
    ? `Tu precio está ${redondeado}% por encima de la mediana del mercado.`
    : `Tu precio está ${redondeado}% por debajo de la mediana del mercado.`;
}
