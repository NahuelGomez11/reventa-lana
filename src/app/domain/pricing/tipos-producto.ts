/**
 * Tipos de producto con un margen de venta SUGERIDO para empezar.
 *
 * AVISO: los porcentajes son SUPUESTOS DE EJEMPLO (ficticios), no datos reales de mercado.
 * La búsqueda pública no dio una tabla fiable por categoría; el único referente encontrado
 * fue un margen bruto de electrónica de 10% a 20% (marginvsmarkup.com). Ajustalos a tu negocio.
 *
 * El margen es sobre el precio de venta (ganancia / precio de venta), igual que en el motor.
 */
export interface TipoProducto {
  id: string;
  nombre: string;
  /** Margen sugerido sobre el precio de venta (%). Supuesto de ejemplo. */
  margenSugeridoPct: number;
}

export const TIPOS_PRODUCTO: readonly TipoProducto[] = [
  { id: 'auriculares', nombre: 'Auriculares', margenSugeridoPct: 25 },
  { id: 'parlantes', nombre: 'Parlantes', margenSugeridoPct: 22 },
  { id: 'smartwatch', nombre: 'Smartwatch y pulseras', margenSugeridoPct: 20 },
  { id: 'accesorios', nombre: 'Accesorios (cables, cargadores, fundas)', margenSugeridoPct: 35 },
  { id: 'almacenamiento', nombre: 'Almacenamiento (discos, pendrives)', margenSugeridoPct: 15 },
  { id: 'tablets', nombre: 'Tablets', margenSugeridoPct: 12 },
  { id: 'celulares', nombre: 'Celulares', margenSugeridoPct: 12 },
  { id: 'pantallas', nombre: 'Monitores y televisores', margenSugeridoPct: 10 },
  { id: 'notebooks', nombre: 'Notebooks', margenSugeridoPct: 10 },
  { id: 'consolas', nombre: 'Consolas y gaming', margenSugeridoPct: 8 },
  { id: 'otros', nombre: 'Otros', margenSugeridoPct: 20 },
];

/** Porcentajes de atajo para probar rápido. */
export const PORCENTAJES_RAPIDOS: readonly number[] = [10, 15, 20, 25, 30];

export function tipoProductoPorId(id: string | null | undefined): TipoProducto | null {
  if (!id) return null;
  return TIPOS_PRODUCTO.find((t) => t.id === id) ?? null;
}

/** Margen sugerido para un tipo, o null si el tipo no existe o no está elegido. */
export function margenSugeridoPara(id: string | null | undefined): number | null {
  return tipoProductoPorId(id)?.margenSugeridoPct ?? null;
}
