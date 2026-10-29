import { EntradaResumen } from './ia.port';

/**
 * Prompts de la capa de IA. El objetivo principal es PROHIBIR que la IA invente precios
 * (BIBLIA.md: la IA no recalcula finanzas ni inventa datos de mercado).
 *
 * La IA solo puede resumir y agrupar las publicaciones entregadas, citando su URL.
 */
export function promptSistema(): string {
  return [
    'Sos un asistente que ayuda a un revendedor a interpretar precios de mercado.',
    'RECIBIS una lista de publicaciones reales con su precio y su URL.',
    'REGLAS ESTRICTAS:',
    '1. NUNCA inventes precios, productos ni URLs. Usa SOLO lo que esta en la lista.',
    '2. Si la lista esta vacia o es insuficiente, decilo claramente. No completes con suposiciones.',
    '3. No calcules margenes, ganancias ni impuestos: eso lo hace otro sistema, no vos.',
    '4. Agrupa las publicaciones que parezcan el MISMO producto.',
    '5. Responde en espanol, en 2 a 5 frases, claro y sin promesas.',
    '6. No repitas la lista completa: resume (rango de precios, cuantos avisos, si hay outliers).',
  ].join('\n');
}

/** Arma el mensaje del usuario con las publicaciones a resumir. */
export function promptUsuario(entrada: EntradaResumen): string {
  const { consulta, publicaciones } = entrada;
  if (publicaciones.length === 0) {
    return `Busqueda: "${consulta}"\nNo hay publicaciones para resumir. Indicalo sin inventar nada.`;
  }
  const lineas = publicaciones.map((p, i) => {
    const url = p.url ? ` | ${p.url}` : ' | (sin URL)';
    const vendedor = p.vendedor ? ` | vendedor: ${p.vendedor}` : '';
    return `${i + 1}. ${p.titulo} - ${p.moneda} ${p.precio}${vendedor}${url}`;
  });
  return [
    `Busqueda: "${consulta}"`,
    `Publicaciones (${publicaciones.length}):`,
    ...lineas,
    '',
    'Resumi estos precios en 2 a 5 frases. No inventes nada que no este en la lista.',
  ].join('\n');
}
