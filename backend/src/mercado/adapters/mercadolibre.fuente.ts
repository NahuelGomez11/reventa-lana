import { Inject, Injectable } from '@nestjs/common';
import { MERCADO_CONFIG, MercadoConfig } from '../../config/mercado.config';
import {
  CondicionMercado,
  ConsultaMercado,
  EstadoBusquedaMercado,
  PublicacionMercado,
  ResultadoBusquedaMercado,
} from '../contrato';
import { FuenteMercadoBackend } from '../fuente-mercado.port';
import { FetchLike, HTTP_FETCH } from '../http';
import {
  CredencialesInvalidasError,
  FaltanCredencialesError,
  FalloTokenError,
  TokenService,
} from '../oauth/token.service';

const MENSAJE_NO_CONFIGURADO =
  'La busqueda automatica de precios no esta configurada. Configure las credenciales de Mercado Libre o cargue observaciones manuales.';

function resultado(
  estado: EstadoBusquedaMercado,
  consultadoEn: string,
  opciones: { mensaje?: string | null; publicaciones?: PublicacionMercado[]; total?: number } = {},
): ResultadoBusquedaMercado {
  return {
    estado,
    fuente: 'mercadolibre',
    publicaciones: opciones.publicaciones ?? [],
    total: opciones.total ?? (opciones.publicaciones?.length ?? 0),
    consultadoEn,
    mensaje: opciones.mensaje ?? null,
  };
}

function aCondicion(valor: unknown): CondicionMercado {
  if (valor === 'new') return 'nuevo';
  if (valor === 'used') return 'usado';
  if (valor === 'refurbished') return 'reacondicionado';
  return 'desconocida';
}

function esRegistro(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Convierte una publicacion cruda de Mercado Libre al modelo propio.
 * Devuelve null si no tiene titulo o precio valido (no se inventan datos).
 */
export function aPublicacion(item: unknown, consultadoEn: string): PublicacionMercado | null {
  if (!esRegistro(item)) return null;
  const titulo = typeof item['title'] === 'string' ? item['title'].trim() : '';
  const precio = typeof item['price'] === 'number' && Number.isFinite(item['price']) ? item['price'] : null;
  if (titulo === '' || precio == null || precio <= 0) return null;

  const id = typeof item['id'] === 'string' && item['id'] !== '' ? item['id'] : null;
  const shipping = esRegistro(item['shipping']) ? item['shipping'] : null;
  const envioGratis = shipping?.['free_shipping'] === true;

  return {
    id: id ?? titulo,
    fuente: 'mercadolibre',
    itemId: id,
    productId: typeof item['catalog_product_id'] === 'string' ? item['catalog_product_id'] : null,
    titulo,
    precio,
    moneda: item['currency_id'] === 'USD' ? 'USD' : 'ARS',
    url: typeof item['permalink'] === 'string' && item['permalink'] !== '' ? item['permalink'] : null,
    vendedor: null,
    condicion: aCondicion(item['condition']),
    // Solo se informa "gratis" cuando Mercado Libre lo confirma; el costo real no se asume.
    envio: { tipo: envioGratis ? 'gratis' : 'desconocido', costo: null },
    disponible: typeof item['status'] === 'string' ? item['status'] === 'active' : true,
    consultadoEn,
  };
}

/**
 * Fuente real: consulta la API oficial de Mercado Libre (`/sites/{site}/search`).
 * Requiere credenciales OAuth validas; nunca las expone en la respuesta ni en logs.
 */
@Injectable()
export class MercadoLibreFuente implements FuenteMercadoBackend {
  constructor(
    @Inject(MERCADO_CONFIG) private readonly config: MercadoConfig,
    private readonly tokens: TokenService,
    @Inject(HTTP_FETCH) private readonly fetch: FetchLike,
  ) {}

  async buscar(consulta: ConsultaMercado): Promise<ResultadoBusquedaMercado> {
    const consultadoEn = new Date().toISOString();

    let accessToken: string;
    try {
      accessToken = await this.tokens.obtenerAccessToken();
    } catch (e) {
      if (e instanceof FaltanCredencialesError) {
        return resultado('no_configurado', consultadoEn, { mensaje: MENSAJE_NO_CONFIGURADO });
      }
      if (e instanceof CredencialesInvalidasError) {
        return resultado('error', consultadoEn, {
          mensaje: 'Las credenciales de Mercado Libre son invalidas. Revise la configuracion del backend.',
        });
      }
      if (e instanceof FalloTokenError) {
        return resultado('no_disponible', consultadoEn, {
          mensaje: 'No se pudo obtener acceso a Mercado Libre en este momento.',
        });
      }
      return resultado('error', consultadoEn, { mensaje: 'Error inesperado al autenticar con la fuente.' });
    }

    const params = new URLSearchParams({ q: consulta.q, limit: String(consulta.limite) });
    const url = `${this.config.apiBase}/sites/${encodeURIComponent(consulta.siteId)}/search?${params.toString()}`;

    let resp: Response;
    try {
      resp = await this.fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch {
      return resultado('no_disponible', consultadoEn, {
        mensaje: 'No se pudo contactar la fuente de mercado (red o tiempo de espera).',
      });
    }

    if (resp.status === 429) {
      return resultado('limite', consultadoEn, {
        mensaje: 'Mercado Libre alcanzo el limite de consultas. Proba mas tarde.',
      });
    }
    if (resp.status === 401 || resp.status === 403) {
      return resultado('error', consultadoEn, {
        mensaje: 'Mercado Libre rechazo el acceso (credenciales o permisos).',
      });
    }
    if (!resp.ok) {
      return resultado('no_disponible', consultadoEn, {
        mensaje: `La fuente de mercado respondio HTTP ${resp.status}.`,
      });
    }

    let crudo: unknown;
    try {
      crudo = await resp.json();
    } catch {
      return resultado('error', consultadoEn, { mensaje: 'La fuente devolvio una respuesta no valida.' });
    }
    if (!esRegistro(crudo) || !Array.isArray(crudo['results'])) {
      return resultado('error', consultadoEn, { mensaje: 'La fuente devolvio una respuesta inesperada.' });
    }

    const publicaciones = (crudo['results'] as unknown[])
      .map((item) => aPublicacion(item, consultadoEn))
      .filter((p): p is PublicacionMercado => p != null);

    const paging = esRegistro(crudo['paging']) ? crudo['paging'] : null;
    const totalCrudo = paging?.['total'];
    const total =
      typeof totalCrudo === 'number' && Number.isFinite(totalCrudo) ? totalCrudo : publicaciones.length;

    if (publicaciones.length === 0) {
      return resultado('sin_resultados', consultadoEn, {
        mensaje: 'No se encontraron publicaciones para la busqueda.',
        total,
      });
    }
    return resultado('ok', consultadoEn, { publicaciones, total });
  }

  async obtenerItem(itemId: string): Promise<ResultadoBusquedaMercado> {
    const consultadoEn = new Date().toISOString();

    if (!/^ML[A-Z]{1,3}[0-9]{6,}$/i.test(itemId)) {
      return resultado('error', consultadoEn, {
        mensaje: 'El identificador de la publicacion no es valido (ej.: MLA123456789).',
      });
    }

    let accessToken: string;
    try {
      accessToken = await this.tokens.obtenerAccessToken();
    } catch (e) {
      if (e instanceof FaltanCredencialesError) {
        return resultado('no_configurado', consultadoEn, { mensaje: MENSAJE_NO_CONFIGURADO });
      }
      if (e instanceof CredencialesInvalidasError) {
        return resultado('error', consultadoEn, {
          mensaje: 'Las credenciales de Mercado Libre son invalidas. Revise la configuracion del backend.',
        });
      }
      if (e instanceof FalloTokenError) {
        return resultado('no_disponible', consultadoEn, {
          mensaje: 'No se pudo obtener acceso a Mercado Libre en este momento.',
        });
      }
      return resultado('error', consultadoEn, { mensaje: 'Error inesperado al autenticar con la fuente.' });
    }

    const url = `${this.config.apiBase}/items/${encodeURIComponent(itemId)}`;
    let resp: Response;
    try {
      resp = await this.fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch {
      return resultado('no_disponible', consultadoEn, {
        mensaje: 'No se pudo contactar la fuente de mercado (red o tiempo de espera).',
      });
    }

    if (resp.status === 404) {
      return resultado('sin_resultados', consultadoEn, {
        mensaje: 'No se encontro la publicacion indicada.',
      });
    }
    if (resp.status === 429) {
      return resultado('limite', consultadoEn, {
        mensaje: 'Mercado Libre alcanzo el limite de consultas. Proba mas tarde.',
      });
    }
    if (resp.status === 401 || resp.status === 403) {
      return resultado('error', consultadoEn, {
        mensaje: 'Mercado Libre rechazo el acceso (credenciales o permisos).',
      });
    }
    if (!resp.ok) {
      return resultado('no_disponible', consultadoEn, {
        mensaje: `La fuente de mercado respondio HTTP ${resp.status}.`,
      });
    }

    let crudo: unknown;
    try {
      crudo = await resp.json();
    } catch {
      return resultado('error', consultadoEn, { mensaje: 'La fuente devolvio una respuesta no valida.' });
    }

    const publicacion = aPublicacion(crudo, consultadoEn);
    if (!publicacion) {
      return resultado('sin_resultados', consultadoEn, {
        mensaje: 'La publicacion no tiene datos utilizables.',
      });
    }
    return resultado('ok', consultadoEn, { publicaciones: [publicacion], total: 1 });
  }
}
