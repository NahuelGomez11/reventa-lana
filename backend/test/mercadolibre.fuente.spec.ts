import { MercadoConfig } from '../src/config/mercado.config';
import { MercadoLibreFuente, aPublicacion } from '../src/mercado/adapters/mercadolibre.fuente';
import { FetchLike } from '../src/mercado/http';
import {
  FaltanCredencialesError,
  TokenService,
} from '../src/mercado/oauth/token.service';

const TOKEN = 'ACCESO_SECRETO';

function respuesta(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

function config(overrides: Partial<MercadoConfig> = {}): MercadoConfig {
  return {
    apiBase: 'https://api.mercadolibre.com',
    siteId: 'MLA',
    clientId: 'APP_ID',
    clientSecret: 'SECRETO_CLIENTE',
    refreshToken: 'REFRESH',
    tokenStorePath: 'no-usado.json',
    maxResultados: 50,
    timeoutMs: 1000,
    reqPorMinuto: 60,
    corsOrigin: 'http://localhost:4200',
    port: 3000,
    authBase: 'https://auth.mercadolibre.com.ar',
    oauthRedirectUri: null,
    oauthPkce: false,
    oauthStateStorePath: 'no-usado-oauth.json',
    ...overrides,
  };
}

function tokensOk(): TokenService {
  return { obtenerAccessToken: async () => TOKEN } as unknown as TokenService;
}

function itemValido(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'MLA1',
    title: 'Auriculares X',
    price: 15000,
    currency_id: 'ARS',
    permalink: 'https://articulo.mercadolibre.com.ar/MLA-1',
    condition: 'new',
    status: 'active',
    catalog_product_id: 'MLA-CAT-1',
    shipping: { free_shipping: true },
    ...overrides,
  };
}

const CONSULTA = { q: 'auriculares', siteId: 'MLA', limite: 20 };

describe('aPublicacion', () => {
  it('mapea los campos informados y no inventa envío con costo', () => {
    const p = aPublicacion(itemValido({ shipping: { free_shipping: false } }), 'FECHA');
    expect(p?.precio).toBe(15000);
    expect(p?.condicion).toBe('nuevo');
    expect(p?.moneda).toBe('ARS');
    expect(p?.envio).toEqual({ tipo: 'desconocido', costo: null });
    expect(p?.consultadoEn).toBe('FECHA');
  });

  it('descarta publicaciones sin precio o título', () => {
    expect(aPublicacion({ title: 'sin precio' }, 'F')).toBeNull();
    expect(aPublicacion(itemValido({ price: 0 }), 'F')).toBeNull();
    expect(aPublicacion(itemValido({ title: '   ' }), 'F')).toBeNull();
    expect(aPublicacion(null, 'F')).toBeNull();
  });
});

describe('MercadoLibreFuente', () => {
  it('consulta la API, mapea resultados y no expone el token', async () => {
    const fetch: FetchLike = jest.fn(async (url) => {
      expect(String(url)).toContain('/sites/MLA/search');
      return respuesta(200, { paging: { total: 1 }, results: [itemValido()] });
    });
    const fuente = new MercadoLibreFuente(config(), tokensOk(), fetch);

    const r = await fuente.buscar(CONSULTA);

    expect(r.estado).toBe('ok');
    expect(r.total).toBe(1);
    expect(r.publicaciones).toHaveLength(1);
    expect(r.publicaciones[0].titulo).toBe('Auriculares X');
    expect(JSON.stringify(r)).not.toContain(TOKEN);
  });

  it('devuelve sin_resultados cuando no hay publicaciones utilizables', async () => {
    const fetch: FetchLike = jest.fn(async () => respuesta(200, { results: [] }));
    const r = await new MercadoLibreFuente(config(), tokensOk(), fetch).buscar(CONSULTA);
    expect(r.estado).toBe('sin_resultados');
    expect(r.publicaciones).toHaveLength(0);
  });

  it('descarta elementos sin precio y si no queda ninguno informa sin_resultados', async () => {
    const fetch: FetchLike = jest.fn(async () =>
      respuesta(200, { results: [{ id: 'X' }, { id: 'Y', title: 'sin precio' }] }),
    );
    const r = await new MercadoLibreFuente(config(), tokensOk(), fetch).buscar(CONSULTA);
    expect(r.estado).toBe('sin_resultados');
  });

  it('traduce 429 a limite', async () => {
    const fetch: FetchLike = jest.fn(async () => respuesta(429, {}));
    const r = await new MercadoLibreFuente(config(), tokensOk(), fetch).buscar(CONSULTA);
    expect(r.estado).toBe('limite');
  });

  it('traduce 401/403 a error de credenciales', async () => {
    const fetch: FetchLike = jest.fn(async () => respuesta(403, { message: 'forbidden' }));
    const r = await new MercadoLibreFuente(config(), tokensOk(), fetch).buscar(CONSULTA);
    expect(r.estado).toBe('error');
    expect(r.mensaje).toMatch(/rechazo el acceso/i);
  });

  it('devuelve no_disponible ante un error HTTP del servidor', async () => {
    const fetch: FetchLike = jest.fn(async () => respuesta(500, {}));
    const r = await new MercadoLibreFuente(config(), tokensOk(), fetch).buscar(CONSULTA);
    expect(r.estado).toBe('no_disponible');
  });

  it('devuelve no_disponible ante error de red o tiempo de espera', async () => {
    const fetch: FetchLike = jest.fn(async () => {
      throw new Error('timeout');
    });
    const r = await new MercadoLibreFuente(config(), tokensOk(), fetch).buscar(CONSULTA);
    expect(r.estado).toBe('no_disponible');
  });

  it('devuelve error ante una respuesta JSON inesperada', async () => {
    const fetch: FetchLike = jest.fn(async () => respuesta(200, { no_es_lo_esperado: true }));
    const r = await new MercadoLibreFuente(config(), tokensOk(), fetch).buscar(CONSULTA);
    expect(r.estado).toBe('error');
  });

  it('devuelve no_configurado cuando faltan credenciales', async () => {
    const tokens = {
      obtenerAccessToken: async () => {
        throw new FaltanCredencialesError();
      },
    } as unknown as TokenService;
    const fetch: FetchLike = jest.fn();
    const r = await new MercadoLibreFuente(config({ clientId: null }), tokens, fetch).buscar(CONSULTA);
    expect(r.estado).toBe('no_configurado');
    expect(fetch).not.toHaveBeenCalled();
  });
});
