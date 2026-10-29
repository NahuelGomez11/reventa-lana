import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MercadoConfig } from '../src/config/mercado.config';
import { FetchLike } from '../src/mercado/http';
import {
  CredencialesInvalidasError,
  FaltanCredencialesError,
  FalloTokenError,
  TokenService,
} from '../src/mercado/oauth/token.service';

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
    refreshToken: 'REFRESH_VIEJO',
    tokenStorePath: join(tmpdir(), `reventa-op-token-${Date.now()}-${Math.random().toString(16).slice(2)}.json`),
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

describe('TokenService', () => {
  it('renueva el access token y persiste el refresh token rotado', async () => {
    const cfg = config();
    const fetch: FetchLike = jest.fn(async () =>
      respuesta(200, { access_token: 'ACCESO_NUEVO', expires_in: 21600, refresh_token: 'REFRESH_ROTADO' }),
    );
    const service = new TokenService(cfg, fetch);

    await expect(service.obtenerAccessToken()).resolves.toBe('ACCESO_NUEVO');

    const guardado = JSON.parse(await fs.readFile(cfg.tokenStorePath, 'utf8'));
    expect(guardado.refresh_token).toBe('REFRESH_ROTADO');
    await fs.rm(cfg.tokenStorePath, { force: true });
  });

  it('reutiliza el access token vigente sin volver a llamar al servidor de tokens', async () => {
    const fetch: FetchLike = jest.fn(async () =>
      respuesta(200, { access_token: 'ACCESO', expires_in: 21600 }),
    );
    const service = new TokenService(config(), fetch);

    await service.obtenerAccessToken();
    await service.obtenerAccessToken();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('comparte una sola renovacion entre llamadas concurrentes (refresh token de un solo uso)', async () => {
    const cfg = config({ refreshToken: 'REFRESH_VIEJO' });
    const fetch: FetchLike = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return respuesta(200, {
        access_token: 'ACCESO_UNICO',
        expires_in: 21600,
        refresh_token: 'REFRESH_ROTADO',
      });
    });
    const service = new TokenService(cfg, fetch);

    const resultados = await Promise.all([
      service.obtenerAccessToken(),
      service.obtenerAccessToken(),
      service.obtenerAccessToken(),
    ]);

    expect((fetch as jest.Mock).mock.calls.length).toBe(1);
    expect(resultados).toEqual(['ACCESO_UNICO', 'ACCESO_UNICO', 'ACCESO_UNICO']);
    await fs.rm(cfg.tokenStorePath, { force: true });
  });

  it('una respuesta OAuth incompleta no sobrescribe el token valido ni persiste nada', async () => {
    const cfg = config({ refreshToken: 'REFRESH_VIEJO' });
    await fs.writeFile(cfg.tokenStorePath, JSON.stringify({ refresh_token: 'REFRESH_PERSISTIDO' }), 'utf8');
    // Respuesta invalida: trae refresh_token pero NO access_token.
    const fetch: FetchLike = jest.fn(async () => respuesta(200, { refresh_token: 'REFRESH_NUEVO' }));
    const service = new TokenService(cfg, fetch);

    await expect(service.obtenerAccessToken()).rejects.toBeInstanceOf(FalloTokenError);

    const guardado = JSON.parse(await fs.readFile(cfg.tokenStorePath, 'utf8'));
    expect(guardado.refresh_token).toBe('REFRESH_PERSISTIDO');
    await fs.rm(cfg.tokenStorePath, { force: true });
  });

  it('no sobrescribe el store si la rotacion devuelve un refresh_token vacio', async () => {
    const cfg = config({ refreshToken: 'REFRESH_VIEJO' });
    await fs.writeFile(cfg.tokenStorePath, JSON.stringify({ refresh_token: 'REFRESH_PERSISTIDO' }), 'utf8');
    const fetch: FetchLike = jest.fn(async () =>
      respuesta(200, { access_token: 'ACCESO', expires_in: 21600, refresh_token: '' }),
    );
    const service = new TokenService(cfg, fetch);

    await expect(service.obtenerAccessToken()).resolves.toBe('ACCESO');

    const guardado = JSON.parse(await fs.readFile(cfg.tokenStorePath, 'utf8'));
    expect(guardado.refresh_token).toBe('REFRESH_PERSISTIDO');
    await fs.rm(cfg.tokenStorePath, { force: true });
  });

  it('si falla la persistencia, mantiene el token en memoria y no propaga el error', async () => {
    const archivo = join(tmpdir(), `reventa-op-bloque-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await fs.writeFile(archivo, 'soy un archivo, no un directorio', 'utf8');
    const cfg = config({ tokenStorePath: join(archivo, 'tokens.json') });
    const fetch: FetchLike = jest.fn(async () =>
      respuesta(200, { access_token: 'ACCESO', expires_in: 21600, refresh_token: 'REFRESH_ROTADO' }),
    );
    const service = new TokenService(cfg, fetch);

    await expect(service.obtenerAccessToken()).resolves.toBe('ACCESO');
    await expect(service.obtenerAccessToken()).resolves.toBe('ACCESO');
    expect((fetch as jest.Mock).mock.calls.length).toBe(1);
    await fs.rm(archivo, { force: true });
  });

  it('incluye code_verifier cuando la aplicacion tiene PKCE habilitado', async () => {
    const cfg = config({ refreshToken: null });
    let cuerpo = '';
    const fetch: FetchLike = jest.fn(async (_url, init) => {
      cuerpo = String(init?.body ?? '');
      return respuesta(200, { access_token: 'ACCESO', expires_in: 21600, refresh_token: 'REFRESH_PKCE' });
    });
    const service = new TokenService(cfg, fetch);

    await service.canjearCodigoAutorizacion('CODIGO', 'https://mi-app/callback', 'VERIFICADOR_PKCE');

    expect(cuerpo).toContain('grant_type=authorization_code');
    expect(cuerpo).toContain('code_verifier=VERIFICADOR_PKCE');
    await fs.rm(cfg.tokenStorePath, { force: true });
  });

  it('lanza FaltanCredencialesError si no hay client_id/client_secret/refresh_token', async () => {
    const fetch: FetchLike = jest.fn();
    const service = new TokenService(
      config({ clientId: null, clientSecret: null, refreshToken: null }),
      fetch,
    );

    await expect(service.obtenerAccessToken()).rejects.toBeInstanceOf(FaltanCredencialesError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lanza CredencialesInvalidasError ante HTTP 400/401', async () => {
    const fetch: FetchLike = jest.fn(async () => respuesta(401, { error: 'invalid_grant' }));
    const service = new TokenService(config(), fetch);

    await expect(service.obtenerAccessToken()).rejects.toBeInstanceOf(CredencialesInvalidasError);
  });

  it('lanza FalloTokenError ante respuestas inesperadas', async () => {
    const fetch: FetchLike = jest.fn(async () => respuesta(500, { mensaje: 'boom' }));
    const service = new TokenService(config(), fetch);

    await expect(service.obtenerAccessToken()).rejects.toBeInstanceOf(FalloTokenError);
  });

  it('canjea el codigo de autorizacion y deja el refresh token persistido', async () => {
    const cfg = config({ refreshToken: null });
    const fetch: FetchLike = jest.fn(async () =>
      respuesta(200, { access_token: 'ACCESO', expires_in: 21600, refresh_token: 'REFRESH_CANJE' }),
    );
    const service = new TokenService(cfg, fetch);

    await service.canjearCodigoAutorizacion('CODIGO', 'https://mi-app/callback');

    const guardado = JSON.parse(await fs.readFile(cfg.tokenStorePath, 'utf8'));
    expect(guardado.refresh_token).toBe('REFRESH_CANJE');
    await expect(service.obtenerAccessToken()).resolves.toBe('ACCESO');
    await fs.rm(cfg.tokenStorePath, { force: true });
  });

  it('nunca registra el client_secret ni el refresh_token en los logs', async () => {
    const capturado: unknown[] = [];
    const spies = [
      jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => capturado.push(...a)),
      jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => capturado.push(...a)),
      jest.spyOn(console, 'error').mockImplementation((...a: unknown[]) => capturado.push(...a)),
      jest.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
        capturado.push(chunk);
        return true;
      }),
      jest.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
        capturado.push(chunk);
        return true;
      }),
    ];
    const cfg = config({ clientSecret: 'SECRETO_CLIENTE', refreshToken: 'REFRESH_VIEJO' });
    const fetch: FetchLike = jest.fn(async () =>
      respuesta(200, { access_token: 'ACCESO_SECRETO', expires_in: 21600, refresh_token: 'REFRESH_ROTADO' }),
    );
    const service = new TokenService(cfg, fetch);

    await service.obtenerAccessToken();

    const llamadas = capturado.map((v) => String(v)).join(' | ');
    expect(llamadas).not.toContain('SECRETO_CLIENTE');
    expect(llamadas).not.toContain('REFRESH_VIEJO');
    expect(llamadas).not.toContain('REFRESH_ROTADO');
    expect(llamadas).not.toContain('ACCESO_SECRETO');

    spies.forEach((s) => s.mockRestore());
    await fs.rm(cfg.tokenStorePath, { force: true });
  });
});
