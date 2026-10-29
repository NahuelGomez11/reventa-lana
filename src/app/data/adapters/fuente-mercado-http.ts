import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ConsultaMercado,
  EnvioPublicacion,
  EstadoBusquedaMercado,
  PublicacionMercado,
  ResultadoBusquedaMercado,
} from '../../core/models/mercado.model';
import { CondicionProducto } from '../../core/models/producto.model';
import { ahoraIso } from '../../core/utils/id';
import { FuenteMercado, resultadoNoConfigurado } from '../../domain/market/fuente-mercado';

function esRegistro(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function esEstadoValido(v: string): v is EstadoBusquedaMercado {
  return (
    v === 'ok' ||
    v === 'sin_resultados' ||
    v === 'insuficiente' ||
    v === 'no_configurado' ||
    v === 'no_disponible' ||
    v === 'limite' ||
    v === 'error'
  );
}

function aCondicion(v: unknown): CondicionProducto {
  return v === 'nuevo' || v === 'usado' || v === 'reacondicionado' ? v : 'desconocida';
}

function aEnvio(v: unknown): EnvioPublicacion {
  if (esRegistro(v)) {
    const tipo = v['tipo'] === 'gratis' || v['tipo'] === 'pago' ? v['tipo'] : 'desconocido';
    const costo = typeof v['costo'] === 'number' && Number.isFinite(v['costo']) ? v['costo'] : null;
    return { tipo, costo };
  }
  return { tipo: 'desconocido', costo: null };
}

function aPublicacion(v: unknown, consultadoEnDefecto: string): PublicacionMercado | null {
  if (!esRegistro(v)) return null;
  const precio = typeof v['precio'] === 'number' && Number.isFinite(v['precio']) ? v['precio'] : null;
  const titulo = typeof v['titulo'] === 'string' && v['titulo'].trim() !== '' ? v['titulo'] : null;
  if (precio == null || precio <= 0 || titulo == null) return null;
  const itemId = typeof v['itemId'] === 'string' ? v['itemId'] : null;
  const url = typeof v['url'] === 'string' ? v['url'] : null;
  const id = typeof v['id'] === 'string' && v['id'] !== '' ? v['id'] : (itemId ?? url ?? titulo);
  return {
    id,
    fuente: 'mercadolibre',
    itemId,
    productId: typeof v['productId'] === 'string' ? v['productId'] : null,
    titulo,
    precio,
    moneda: v['moneda'] === 'USD' ? 'USD' : 'ARS',
    url,
    vendedor: typeof v['vendedor'] === 'string' ? v['vendedor'] : null,
    condicion: aCondicion(v['condicion']),
    envio: aEnvio(v['envio']),
    disponible: v['disponible'] !== false,
    consultadoEn: typeof v['consultadoEn'] === 'string' ? v['consultadoEn'] : consultadoEnDefecto,
  };
}

function resultadoInvalido(mensaje: string): ResultadoBusquedaMercado {
  return {
    estado: 'error',
    fuente: 'mercadolibre',
    publicaciones: [],
    total: 0,
    consultadoEn: ahoraIso(),
    mensaje,
  };
}

/** Interpreta la respuesta del backend propio. Nunca asume que un dato faltante es 0. */
export function parsearRespuestaMercado(crudo: unknown): ResultadoBusquedaMercado {
  if (!esRegistro(crudo)) {
    return resultadoInvalido('La respuesta de la fuente de mercado no es válida.');
  }
  const consultadoEnDefecto =
    typeof crudo['consultadoEn'] === 'string' ? crudo['consultadoEn'] : ahoraIso();
  const crudas = Array.isArray(crudo['publicaciones']) ? crudo['publicaciones'] : [];
  const publicaciones = crudas
    .map((p) => aPublicacion(p, consultadoEnDefecto))
    .filter((p): p is PublicacionMercado => p != null);
  const total =
    typeof crudo['total'] === 'number' && Number.isFinite(crudo['total'])
      ? crudo['total']
      : publicaciones.length;
  const estado: EstadoBusquedaMercado =
    typeof crudo['estado'] === 'string' && esEstadoValido(crudo['estado'])
      ? crudo['estado']
      : publicaciones.length > 0
        ? 'ok'
        : 'sin_resultados';
  return {
    estado,
    fuente: 'mercadolibre',
    publicaciones,
    total,
    consultadoEn: consultadoEnDefecto,
    mensaje: typeof crudo['mensaje'] === 'string' ? crudo['mensaje'] : null,
  };
}

/**
 * Adaptador real contra el backend propio (que a su vez habla con la API oficial de
 * Mercado Libre y guarda las credenciales). Si no hay `baseUrl`, devuelve
 * "no_configurado": no inventa datos.
 *
 * `baseUrl` es la URL completa del endpoint de búsqueda, p. ej.
 * `http://localhost:3000/market/search`.
 */
export class FuenteMercadoHttp implements FuenteMercado {
  readonly id = 'mercadolibre' as const;
  readonly nombre = 'Mercado Libre';

  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string | null,
    private readonly siteId = 'MLA',
    private readonly itemUrl: string | null = null,
  ) {}

  get configurada(): boolean {
    return this.baseUrl != null && this.baseUrl.trim() !== '';
  }

  /** URL del endpoint de item: la configurada, o derivada de la de búsqueda. */
  private get urlItem(): string | null {
    if (this.itemUrl && this.itemUrl.trim() !== '') return this.itemUrl.trim();
    if (!this.baseUrl || this.baseUrl.trim() === '') return null;
    return this.baseUrl.trim().replace(/\/search\/?$/i, '/item');
  }

  async buscar(consulta: ConsultaMercado): Promise<ResultadoBusquedaMercado> {
    if (!this.baseUrl || this.baseUrl.trim() === '') {
      return resultadoNoConfigurado();
    }
    let params = new HttpParams()
      .set('q', consulta.q)
      .set('site_id', consulta.siteId || this.siteId);
    if (consulta.marca) params = params.set('marca', consulta.marca);
    if (consulta.modelo) params = params.set('modelo', consulta.modelo);
    if (consulta.limite != null) params = params.set('limit', String(consulta.limite));
    try {
      const cuerpo = await firstValueFrom(
        this.http.get<unknown>(this.baseUrl, { params }),
      );
      return parsearRespuestaMercado(cuerpo);
    } catch (e) {
      return this.aError(e);
    }
  }

  async obtenerItem(itemId: string): Promise<ResultadoBusquedaMercado> {
    const url = this.urlItem;
    if (!url) {
      return resultadoNoConfigurado();
    }
    const params = new HttpParams().set('item_id', itemId);
    try {
      const cuerpo = await firstValueFrom(this.http.get<unknown>(url, { params }));
      return parsearRespuestaMercado(cuerpo);
    } catch (e) {
      return this.aError(e);
    }
  }

  private aError(e: unknown): ResultadoBusquedaMercado {
    const mensajeBase = 'No se pudo consultar la fuente de mercado.';
    if (e instanceof HttpErrorResponse) {
      if (e.status === 429) {
        return this.resultado(
          'limite',
          'Se alcanzó el límite de consultas de la fuente. Probá más tarde o cargá observaciones manuales.',
        );
      }
      if (e.status === 0) {
        return this.resultado(
          'no_disponible',
          `${mensajeBase} Revisá la conexión o la configuración de la fuente.`,
        );
      }
      return this.resultado('no_disponible', `${mensajeBase} (HTTP ${e.status}).`);
    }
    return this.resultado('error', mensajeBase);
  }

  private resultado(estado: EstadoBusquedaMercado, mensaje: string): ResultadoBusquedaMercado {
    return {
      estado,
      fuente: 'mercadolibre',
      publicaciones: [],
      total: 0,
      consultadoEn: ahoraIso(),
      mensaje,
    };
  }
}

/** Fuente por defecto cuando no hay backend configurado. No devuelve datos: solo "no configurado". */
export class FuenteMercadoNula implements FuenteMercado {
  readonly id = 'mercadolibre' as const;
  readonly nombre = 'Sin fuente configurada';
  readonly configurada = false;

  async buscar(): Promise<ResultadoBusquedaMercado> {
    return resultadoNoConfigurado();
  }

  async obtenerItem(): Promise<ResultadoBusquedaMercado> {
    return resultadoNoConfigurado();
  }
}
