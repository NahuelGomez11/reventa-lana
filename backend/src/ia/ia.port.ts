/**
 * Contrato de la capa de IA. La IA es un RESUMIDOR, no una fuente de datos.
 *
 * - Recibe publicaciones que ya trajo una fuente real (con URL).
 * - Devuelve un resumen en texto + referencias a esas publicaciones.
 * - Nunca debe devolver precios que no esten en la entrada.
 */
export interface PublicacionParaResumen {
  id: string;
  titulo: string;
  precio: number;
  moneda: 'ARS' | 'USD';
  url: string | null;
  vendedor: string | null;
  condicion: string;
}

export interface EntradaResumen {
  /** Termino buscado (nombre del producto). */
  consulta: string;
  publicaciones: PublicacionParaResumen[];
}

export interface ResumenIa {
  /** Proveedor que genero el resumen ('gemini'), o null si no hay IA configurada. */
  proveedor: 'gemini' | null;
  /** Texto del resumen. null si no se pudo generar. */
  resumen: string | null;
  /** URLs de fuente citadas (solo de las publicaciones de entrada). */
  fuentes: string[];
  /** Ids de las publicaciones que la IA considero el mismo producto. */
  idsAgrupados: string[];
  estado: 'ok' | 'no_configurado' | 'error';
  mensaje: string | null;
}

/** Puerto que implementa cada proveedor de IA (hoy, Gemini). */
export interface IaProvider {
  readonly id: 'gemini' | null;
  readonly configurada: boolean;
  resumir(entrada: EntradaResumen): Promise<ResumenIa>;
}

/** Token de inyeccion del proveedor de IA (sustituible por uno simulado en pruebas). */
export const IA_PROVIDER = Symbol('IA_PROVIDER');
