/**
 * Identificador estable y único para entidades locales (productos, proveedores, observaciones).
 * No depende de servicios externos.
 */
export function nuevoId(prefix = 'id'): string {
  const cryptoObj: Crypto | undefined = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Fecha de hoy en formato ISO (para registros de consulta). */
export function ahoraIso(): string {
  return new Date().toISOString();
}
