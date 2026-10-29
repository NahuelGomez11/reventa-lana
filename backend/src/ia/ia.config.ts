/**
 * Configuracion tipada del proveedor de IA (resumen de datos de mercado ya traidos).
 *
 * REGLA DE ORO (BIBLIA.md): la IA NUNCA trae precios por si sola ni los inventa.
 * Solo resume/agrupa publicaciones que YA vinieron de una fuente real con su URL.
 *
 * Por defecto `proveedor = 'ninguno'`: la app funciona sin IA y en estado honesto.
 */
export type ProveedorIa = 'ninguno' | 'gemini';

export interface IaConfig {
  proveedor: ProveedorIa;
  geminiApiKey: string | null;
  geminiModelo: string;
  /** Activa "Grounding with Google Search" (búsqueda real con citas de fuentes). */
  geminiBusquedaWeb: boolean;
  geminiApiBase: string;
  timeoutMs: number;
  /** Reintentos ante 503/5xx (el proveedor suele responder intermitentemente). */
  reintentos: number;
}

export const IA_CONFIG = Symbol('IA_CONFIG');

function textoONull(valor: string | undefined): string | null {
  if (typeof valor !== 'string') return null;
  const v = valor.trim();
  return v === '' ? null : v;
}

function numeroPositivo(valor: string | undefined, porDefecto: number): number {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

function booleano(valor: string | undefined, porDefecto: boolean): boolean {
  if (typeof valor !== 'string') return porDefecto;
  const v = valor.trim().toLowerCase();
  if (v === '') return porDefecto;
  return v === 'true' || v === '1' || v === 'yes' || v === 'si' || v === 'sí';
}

function proveedorValido(valor: string | undefined): ProveedorIa {
  const v = (valor ?? '').trim().toLowerCase();
  return v === 'gemini' ? 'gemini' : 'ninguno';
}

/**
 * Lee la configuracion de IA desde variables de entorno. No contiene secretos por defecto.
 * Si falta la API key, el proveedor efectivo queda desactivado aunque se pida uno.
 */
export function leerConfigIa(env: NodeJS.ProcessEnv = process.env): IaConfig {
  const pedido = proveedorValido(env.IA_PROVEEDOR);
  const geminiApiKey = textoONull(env.GEMINI_API_KEY);
  const proveedor: ProveedorIa = pedido === 'gemini' && geminiApiKey == null ? 'ninguno' : pedido;

  return {
    proveedor,
    geminiApiKey,
    geminiModelo: env.GEMINI_MODELO?.trim() || 'gemini-3.5-flash',
    geminiBusquedaWeb: booleano(env.GEMINI_BUSQUEDA_WEB, true),
    geminiApiBase: (env.GEMINI_API_BASE ?? 'https://generativelanguage.googleapis.com').replace(/\/+$/, ''),
    timeoutMs: numeroPositivo(env.IA_TIMEOUT_MS, 60000),
    reintentos: numeroPositivo(env.IA_REINTENTOS, 3),
  };
}
