import { AnalisisProducto } from '../domain/analysis/analisis-producto';

/**
 * Veredicto simple para el usuario. Es una traducción PRESENTACIONAL de resultados que ya
 * calculó el dominio: no recalcula nada ni cambia cifras.
 */
export type Veredicto = 'conviene' | 'revisar' | 'no_conviene' | 'faltan_datos';

export function veredictoDe(analisis: AnalisisProducto): Veredicto {
  const r = analisis.resultado;
  if (!r) return 'faltan_datos';
  if (analisis.nivelRiesgo === 'alta' || r.gananciaPotencialTotal <= 0) return 'no_conviene';
  if (analisis.nivelRiesgo === 'media') return 'revisar';
  return 'conviene';
}

export interface InfoVeredicto {
  etiqueta: string;
  titulo: string;
  mensaje: string;
  /** Clases del distintivo corto. */
  chip: string;
  /** Clases del bloque grande (fondo y borde). */
  bloque: string;
  /** Color del texto grande. */
  color: string;
}

export function infoVeredicto(v: Veredicto): InfoVeredicto {
  switch (v) {
    case 'conviene':
      return {
        etiqueta: 'Conviene',
        titulo: 'Te conviene',
        mensaje: 'Con estos números ganás y no hay alertas importantes.',
        chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
        bloque: 'bg-emerald-50 ring-emerald-200',
        color: 'text-emerald-800',
      };
    case 'revisar':
      return {
        etiqueta: 'Revisar',
        titulo: 'Revisá antes de comprar',
        mensaje: 'Ganás, pero hay puntos de riesgo. Mirá las alertas abajo.',
        chip: 'bg-amber-100 text-amber-800 ring-amber-200',
        bloque: 'bg-amber-50 ring-amber-200',
        color: 'text-amber-800',
      };
    case 'no_conviene':
      return {
        etiqueta: 'No conviene',
        titulo: 'No te conviene',
        mensaje: 'Con estos números ganás poco o perdés. Probá otro precio o un costo más bajo.',
        chip: 'bg-rose-100 text-rose-800 ring-rose-200',
        bloque: 'bg-rose-50 ring-rose-200',
        color: 'text-rose-800',
      };
    default:
      return {
        etiqueta: 'Faltan datos',
        titulo: 'Faltan datos',
        mensaje: 'Completá los datos que faltan para saber si te conviene.',
        chip: 'bg-slate-100 text-slate-700 ring-slate-200',
        bloque: 'bg-slate-50 ring-slate-200',
        color: 'text-slate-700',
      };
  }
}
