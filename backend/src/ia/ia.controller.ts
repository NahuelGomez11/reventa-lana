import { Body, Controller, Post } from '@nestjs/common';
import { IaService } from './ia.service';
import { PublicacionParaResumen, ResumenIa } from './ia.port';

const MAX_PUBLICACIONES = 50;
const MAX_LARGO_TITULO = 200;

function aMoneda(v: unknown): 'ARS' | 'USD' {
  return v === 'USD' ? 'USD' : 'ARS';
}

function sanearTexto(v: unknown, maxLargo: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (t === '') return null;
  return t.length > maxLargo ? t.slice(0, maxLargo) : t;
}

/**
 * Acepta publicaciones ya normalizadas (las que trae la fuente de mercado) y devuelve un resumen.
 * El frontend NUNCA envia una API key: la key vive solo en el backend.
 *
 * POST /ia/resumir  { consulta, publicaciones: [{ id, titulo, precio, moneda, url, vendedor, condicion }] }
 */
@Controller('ia')
export class IaController {
  constructor(private readonly service: IaService) {}

  @Post('resumir')
  async resumir(
    @Body() cuerpo: { consulta?: unknown; publicaciones?: unknown },
  ): Promise<ResumenIa> {
    const consulta = sanearTexto(cuerpo?.consulta, 200) ?? '';
    const crudas = Array.isArray(cuerpo?.publicaciones) ? cuerpo.publicaciones : [];

    const publicaciones: PublicacionParaResumen[] = [];
    for (const c of crudas.slice(0, MAX_PUBLICACIONES)) {
      if (typeof c !== 'object' || c == null) continue;
      const reg = c as Record<string, unknown>;
      const titulo = sanearTexto(reg['titulo'], MAX_LARGO_TITULO);
      const precio = typeof reg['precio'] === 'number' && Number.isFinite(reg['precio']) ? reg['precio'] : null;
      if (titulo == null || precio == null || precio <= 0) continue;
      publicaciones.push({
        id: sanearTexto(reg['id'], 200) ?? titulo,
        titulo,
        precio,
        moneda: aMoneda(reg['moneda']),
        url: typeof reg['url'] === 'string' && reg['url'].trim() !== '' ? reg['url'] : null,
        vendedor: sanearTexto(reg['vendedor'], 120),
        condicion: sanearTexto(reg['condicion'], 40) ?? 'desconocida',
      });
    }

    return this.service.resumir(consulta, publicaciones);
  }
}