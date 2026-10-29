import { EstadisticasMercado } from './market-stats';

export type UbicacionPrecio = 'sin_mercado' | 'por_debajo' | 'dentro' | 'por_encima';

/**
 * Clasifica un precio propio respecto del rango observado en el mercado.
 * No estima demanda ni inventa datos: solo compara con lo cargado manualmente.
 */
export function clasificarPrecioEnMercado(
  precio: number,
  estadisticas: EstadisticasMercado,
): UbicacionPrecio {
  const { cantidad, minimo, maximo } = estadisticas;
  if (cantidad === 0 || minimo == null || maximo == null) return 'sin_mercado';
  if (precio < minimo) return 'por_debajo';
  if (precio > maximo) return 'por_encima';
  return 'dentro';
}
