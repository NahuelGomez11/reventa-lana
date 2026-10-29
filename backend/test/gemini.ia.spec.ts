import { IaConfig } from '../src/ia/ia.config';
import { GeminiIaProvider } from '../src/ia/adapters/gemini.ia';
import { EntradaResumen } from '../src/ia/ia.port';
import { FetchLike } from '../src/mercado/http';

function respuesta(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

function config(overrides: Partial<IaConfig> = {}): IaConfig {
  return {
    proveedor: 'gemini',
    geminiApiKey: 'AIza-test',
    geminiModelo: 'gemini-3.5-flash',
    geminiBusquedaWeb: true,
    geminiApiBase: 'https://generativelanguage.googleapis.com',
    timeoutMs: 5000,
    reintentos: 3,
    ...overrides,
  };
}

const ENTRADA: EntradaResumen = {
  consulta: 'Redmi Buds 6',
  publicaciones: [
    { id: 'a', titulo: 'Auriculares Redmi Buds 6', precio: 71999, moneda: 'ARS', url: 'https://ml.com/a', vendedor: null, condicion: 'nuevo' },
    { id: 'b', titulo: 'Redmi Buds 6 original', precio: 75000, moneda: 'ARS', url: 'https://ml.com/b', vendedor: 'Tienda', condicion: 'nuevo' },
  ],
};

function cuerpoOk(): unknown {
  return {
    candidates: [
      {
        content: { parts: [{ text: 'Los precios rondan entre ARS 71999 y ARS 75000.' }] },
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: 'https://ml.com/a', title: 'ml.com' } },
            { web: { uri: 'https://ml.com/b', title: 'ml.com' } },
            { web: { uri: 'https://ml.com/a', title: 'duplicado' } },
          ],
        },
      },
    ],
  };
}

describe('GeminiIaProvider', () => {
  it('devuelve no_configurado si la key falta', async () => {
    const fetch = jest.fn();
    const p = new GeminiIaProvider(config({ proveedor: 'ninguno', geminiApiKey: null }), fetch as unknown as FetchLike);
    const r = await p.resumir(ENTRADA);
    expect(r.estado).toBe('no_configurado');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('resume y extrae fuentes unicas cuando la respuesta es valida', async () => {
    const fetch = jest.fn(async () => respuesta(200, cuerpoOk()));
    const p = new GeminiIaProvider(config(), fetch as unknown as FetchLike);

    const r = await p.resumir(ENTRADA);

    expect(r.estado).toBe('ok');
    expect(r.proveedor).toBe('gemini');
    expect(r.resumen).toContain('71999');
    expect(r.fuentes).toEqual(['https://ml.com/a', 'https://ml.com/b']);
    expect(r.idsAgrupados).toEqual(['a', 'b']);
  });

  it('envia el tool de busqueda web y la key por header (no en la URL)', async () => {
    const fetch = jest.fn(async () => respuesta(200, cuerpoOk()));
    const p = new GeminiIaProvider(config(), fetch as unknown as FetchLike);

    await p.resumir(ENTRADA);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/v1beta/models/gemini-3.5-flash:generateContent');
    expect(url).not.toContain('AIza-test');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-goog-api-key']).toBe('AIza-test');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(Array.isArray(body['tools'])).toBe(true);
  });

  it('omite la busqueda web cuando esta desactivada', async () => {
    const fetch = jest.fn(async () => respuesta(200, cuerpoOk()));
    const p = new GeminiIaProvider(config({ geminiBusquedaWeb: false }), fetch as unknown as FetchLike);

    await p.resumir(ENTRADA);

    const llamada = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(llamada[1].body as string) as Record<string, unknown>;
    expect(body['tools']).toBeUndefined();
  });

  it('devuelve error si la respuesta no trae texto', async () => {
    const fetch = jest.fn(async () => respuesta(200, { candidates: [] }));
    const p = new GeminiIaProvider(config(), fetch as unknown as FetchLike);
    const r = await p.resumir(ENTRADA);
    expect(r.estado).toBe('error');
    expect(r.resumen).toBeNull();
  });

  it('informa limite ante HTTP 429', async () => {
    const fetch = jest.fn(async () => respuesta(429, {}));
    const p = new GeminiIaProvider(config(), fetch as unknown as FetchLike);
    const r = await p.resumir(ENTRADA);
    expect(r.estado).toBe('error');
    expect(r.mensaje).toContain('limite');
  });

  it('informa error de key ante HTTP 401/403 sin filtrar la key', async () => {
    const fetch = jest.fn(async () => respuesta(403, {}));
    const p = new GeminiIaProvider(config(), fetch as unknown as FetchLike);
    const r = await p.resumir(ENTRADA);
    expect(r.estado).toBe('error');
    expect(JSON.stringify(r)).not.toContain('AIza-test');
  });

  it('informa error de red sin romper', async () => {
    const fetch = jest.fn(async () => {
      throw new Error('fallo de red');
    });
    const p = new GeminiIaProvider(config({ reintentos: 1 }), fetch as unknown as FetchLike);
    const r = await p.resumir(ENTRADA);
    expect(r.estado).toBe('error');
    expect(r.mensaje).toContain('contactar');
  });

  it('reintenta ante 503 y termina OK si luego responde', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(respuesta(503, {}))
      .mockResolvedValueOnce(respuesta(503, {}))
      .mockResolvedValueOnce(respuesta(200, cuerpoOk()));
    const p = new GeminiIaProvider(config({ reintentos: 3 }), fetch as unknown as FetchLike);

    const r = await p.resumir(ENTRADA);

    expect(r.estado).toBe('ok');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('agota los reintentos ante 503 persistente', async () => {
    const fetch = jest.fn(async () => respuesta(503, {}));
    const p = new GeminiIaProvider(config({ reintentos: 2 }), fetch as unknown as FetchLike);

    const r = await p.resumir(ENTRADA);

    expect(r.estado).toBe('error');
    expect(r.mensaje).toContain('saturado');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('no reintenta ante 404 (modelo inexistente) e informa el modelo', async () => {
    const fetch = jest.fn(async () => respuesta(404, {}));
    const p = new GeminiIaProvider(config({ reintentos: 3 }), fetch as unknown as FetchLike);

    const r = await p.resumir(ENTRADA);

    expect(r.estado).toBe('error');
    expect(r.mensaje).toContain('gemini-3.5-flash');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
