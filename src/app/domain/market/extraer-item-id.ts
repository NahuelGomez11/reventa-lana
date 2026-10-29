/**
 * Extrae el identificador de una publicación de Mercado Libre a partir de su URL pública.
 * Devuelve null si no se encuentra un identificador válido.
 *
 * Ejemplo de URL:
 *   https://www.mercadolibre.com.ar/.../up/MLAU4323260255#...&wid=MLA1900308899&...
 * El identificador del item es "MLA1900308899" (prefijo de país + dígitos, sin la "U" de producto).
 */
const PREFIJOS_PAIS = ['MLA', 'MLB', 'MLC', 'MLM', 'MLU', 'MPE', 'MCO', 'MCR', 'MLV', 'MEC', 'MPT'];

export function extraerItemIdDeUrl(url: string): string | null {
  const texto = (url ?? '').trim();
  if (texto === '') return null;

  // 1) Parámetro wid= en query o hash.
  const wid = texto.match(/[?&#]wid=(ML[A-Z0-9]+)/i);
  if (wid) {
    const candidato = normalizar(wid[1]);
    if (candidato) return candidato;
  }

  // 2) Prefijo de país seguido de dígitos (sin "U" de producto universal).
  for (const prefijo of PREFIJOS_PAIS) {
    const regex = new RegExp(prefijo + '\\d{6,}', 'i');
    const match = texto.match(regex);
    if (match) {
      const candidato = normalizar(match[0]);
      // Descartar si es un id de producto universal (prefijo + U + dígitos).
      if (candidato && !esProductoUniversal(candidato, prefijo)) return candidato;
    }
  }

  return null;
}

function normalizar(valor: string): string | null {
  const v = valor.trim().toUpperCase();
  return /^ML[A-Z]{1,3}[0-9]{6,}$/.test(v) ? v : null;
}

function esProductoUniversal(id: string, prefijo: string): boolean {
  // Los ids de producto universal tienen una "U" después del prefijo de país.
  return id.startsWith(prefijo + 'U') && /^\d/.test(id.slice(prefijo.length + 1));
}
