import { PublicacionMercado } from '../../core/models/mercado.model';
import { ObservacionMercado } from '../../core/models/producto.model';
import { nuevoId } from '../../core/utils/id';

/**
 * Convierte una publicación externa normalizada en una observación de mercado.
 * Mapea solo lo que la fuente informa: no inventa marca/modelo/garantía.
 */
export function publicacionAObservacion(p: PublicacionMercado): ObservacionMercado {
  return {
    id: nuevoId('obs'),
    precio: p.precio,
    vendedor: p.vendedor,
    url: p.url,
    marca: null,
    modelo: null,
    caracteristicas: p.titulo,
    condicion: p.condicion,
    accesorios: null,
    garantia: null,
    envio: descripcionEnvio(p),
    fechaConsulta: p.consultadoEn,
    origen: 'auto',
    fuente: p.fuente,
    refExternaId: p.itemId,
  };
}

function descripcionEnvio(p: PublicacionMercado): string | null {
  if (p.envio.tipo === 'gratis') return 'Gratis';
  if (p.envio.tipo === 'pago') {
    return p.envio.costo != null ? `Costo informado: ${p.envio.costo}` : 'Con costo (importe no informado)';
  }
  return null;
}

/** Clave de deduplicación: id externo si existe, si no la URL, si no el id local. */
export function claveObservacion(o: ObservacionMercado): string {
  if (o.refExternaId) return `${o.fuente ?? ''}:${o.refExternaId}`;
  if (o.url) return `url:${o.url}`;
  return `id:${o.id}`;
}

/**
 * Fusiona observaciones existentes con nuevas, sin duplicar por publicación de origen.
 * Conserva el orden: primero las existentes, luego las nuevas.
 */
export function fusionarObservaciones(
  existentes: ObservacionMercado[],
  nuevas: ObservacionMercado[],
): ObservacionMercado[] {
  const vistas = new Set(existentes.map(claveObservacion));
  const resultado = [...existentes];
  for (const o of nuevas) {
    const clave = claveObservacion(o);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    resultado.push(o);
  }
  return resultado;
}

/** Cantidad de días (fraccionarios) transcurridos entre una fecha ISO y "ahora". */
export function diasDesde(fechaConsulta: string, ahora: string): number | null {
  const desde = Date.parse(fechaConsulta);
  const hasta = Date.parse(ahora);
  if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return null;
  return (hasta - desde) / (1000 * 60 * 60 * 24);
}

/**
 * Indica si la observación supera el máximo de días de antigüedad aceptado.
 * Si la fecha no es válida, se considera desactualizada (no confiable).
 */
export function estaDesactualizada(
  fechaConsulta: string,
  ahora: string,
  maxDias: number,
): boolean {
  const dias = diasDesde(fechaConsulta, ahora);
  if (dias == null) return true;
  return dias > maxDias;
}
