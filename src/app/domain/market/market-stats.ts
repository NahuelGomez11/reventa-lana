export interface EstadisticasMercado {
  cantidad: number;
  minimo: number | null;
  maximo: number | null;
  media: number | null;
  mediana: number | null;
  suficiente: boolean;
  advertencias: string[];
}

/**
 * Calcula estadísticas sobre los precios EXTERNOS observados.
 * El precio propio nunca debe incluirse en esta muestra.
 */
export function calcularEstadisticasMercado(
  precios: number[],
  minimoObservaciones = 3,
): EstadisticasMercado {
  const advertencias: string[] = [];
  const validos: number[] = [];

  for (const p of precios) {
    if (!Number.isFinite(p)) {
      advertencias.push('Se ignoró un precio no numérico.');
      continue;
    }
    if (p <= 0) {
      advertencias.push('Se ignoró un precio no positivo.');
      continue;
    }
    validos.push(p);
  }

  validos.sort((a, b) => a - b);

  if (validos.length === 0) {
    advertencias.push('Sin observaciones de mercado válidas.');
    return {
      cantidad: 0,
      minimo: null,
      maximo: null,
      media: null,
      mediana: null,
      suficiente: false,
      advertencias,
    };
  }

  const suma = validos.reduce((acc, p) => acc + p, 0);
  const media = suma / validos.length;
  const mediana =
    validos.length % 2 === 1
      ? validos[(validos.length - 1) / 2]
      : (validos[validos.length / 2 - 1] + validos[validos.length / 2]) / 2;

  const suficiente = validos.length >= minimoObservaciones;
  if (!suficiente) {
    advertencias.push(
      `Información insuficiente: ${validos.length} observación(es) y se requieren al menos ${minimoObservaciones}.`,
    );
  }

  return {
    cantidad: validos.length,
    minimo: validos[0],
    maximo: validos[validos.length - 1],
    media,
    mediana,
    suficiente,
    advertencias,
  };
}

/**
 * Diferencia porcentual del precio propio frente a la mediana del mercado.
 * Positivo = por encima del mercado. Negativo = por debajo.
 * Devuelve null cuando no hay mediana utilizable (evita división por cero).
 */
export function diferenciaPorcentualVsMediana(
  precioPropio: number | null,
  mediana: number | null,
): number | null {
  if (precioPropio == null || !Number.isFinite(precioPropio)) return null;
  if (mediana == null || !Number.isFinite(mediana) || mediana <= 0) return null;
  return ((precioPropio - mediana) / mediana) * 100;
}
