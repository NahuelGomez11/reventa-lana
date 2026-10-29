import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { leerConfigMercado } from '../src/config/mercado.config';
import {
  borrarEstado,
  construirUrlAutorizacion,
  desafioS256,
  estadoCoincide,
  estadoVigente,
  generarState,
  guardarEstado,
  leerEstado,
  parsearCallback,
} from '../src/mercado/oauth/oauth-local';

function rutaTemporal(): string {
  return join(tmpdir(), `reventa-op-oauth-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
}

describe('construirUrlAutorizacion', () => {
  it('arma la URL con response_type, client_id, state y redirect_uri', () => {
    const url = construirUrlAutorizacion({
      authBase: 'https://auth.mercadolibre.com.ar',
      clientId: 'APP_ID',
      redirectUri: 'https://localhost/callback',
      state: 'ESTADO',
    });
    expect(url.startsWith('https://auth.mercadolibre.com.ar/authorization?')).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get('response_type')).toBe('code');
    expect(params.get('client_id')).toBe('APP_ID');
    expect(params.get('state')).toBe('ESTADO');
    expect(params.get('redirect_uri')).toBe('https://localhost/callback');
    expect(params.get('code_challenge')).toBeNull();
  });

  it('agrega PKCE (S256) solo cuando se pasa code_challenge', () => {
    const url = construirUrlAutorizacion({
      authBase: 'https://auth.mercadolibre.com.ar/',
      clientId: 'APP_ID',
      redirectUri: 'https://localhost/callback',
      state: 'ESTADO',
      codeChallenge: 'DESAFIO',
    });
    const params = new URL(url).searchParams;
    expect(params.get('code_challenge')).toBe('DESAFIO');
    expect(params.get('code_challenge_method')).toBe('S256');
  });
});

describe('PKCE y state', () => {
  it('calcula el code_challenge con el vector de ejemplo de RFC 7636', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(desafioS256(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('genera state y code_verifier aleatorios y no vacios', () => {
    const a = generarState();
    const b = generarState();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it('compara el state en tiempo constante', () => {
    expect(estadoCoincide('ABC', 'ABC')).toBe(true);
    expect(estadoCoincide('ABC', 'ABD')).toBe(false);
    expect(estadoCoincide('ABC', 'ABCD')).toBe(false);
    expect(estadoCoincide(null, 'ABC')).toBe(false);
    expect(estadoCoincide('ABC', null)).toBe(false);
  });

  it('considera vigente solo dentro de la ventana', () => {
    const ahora = Date.now();
    expect(estadoVigente(ahora, ahora)).toBe(true);
    expect(estadoVigente(ahora - 9 * 60 * 1000, ahora)).toBe(true);
    expect(estadoVigente(ahora - 11 * 60 * 1000, ahora)).toBe(false);
  });
});

describe('parsearCallback', () => {
  it('lee code y state de la URL completa', () => {
    const datos = parsearCallback('https://localhost/callback?code=COD123&state=EST');
    expect(datos).toEqual({ code: 'COD123', state: 'EST', error: null });
  });

  it('acepta solo la query string o un code suelto', () => {
    expect(parsearCallback('code=COD123&state=EST').code).toBe('COD123');
    const suelto = parsearCallback('COD123');
    expect(suelto.code).toBe('COD123');
    expect(suelto.state).toBeNull();
  });

  it('detecta un error de autorizacion', () => {
    const datos = parsearCallback('https://localhost/callback?error=access_denied');
    expect(datos.error).toBe('access_denied');
    expect(datos.code).toBeNull();
  });
});

describe('almacen temporal de autorizacion', () => {
  it('guarda, lee y borra el estado pendiente', async () => {
    const path = rutaTemporal();
    await guardarEstado(path, { state: 'EST', codeVerifier: 'VER', creadoEn: 123 });
    expect(await leerEstado(path)).toEqual({ state: 'EST', codeVerifier: 'VER', creadoEn: 123 });
    await borrarEstado(path);
    expect(await leerEstado(path)).toBeNull();
  });

  it('devuelve null si el archivo no existe o es invalido', async () => {
    expect(await leerEstado(rutaTemporal())).toBeNull();
    const path = rutaTemporal();
    await fs.writeFile(path, 'no-json', 'utf8');
    expect(await leerEstado(path)).toBeNull();
    await fs.rm(path, { force: true });
  });
});

describe('leerConfigMercado (OAuth local)', () => {
  it('usa valores por defecto no secretos', () => {
    const config = leerConfigMercado({} as NodeJS.ProcessEnv);
    expect(config.authBase).toBe('https://auth.mercadolibre.com.ar');
    expect(config.oauthRedirectUri).toBeNull();
    expect(config.oauthPkce).toBe(false);
    expect(config.oauthStateStorePath).toBe('.mercado-oauth-state.json');
  });

  it('interpreta MERCADO_OAUTH_PKCE y MERCADO_OAUTH_REDIRECT_URI', () => {
    const config = leerConfigMercado({
      MERCADO_OAUTH_PKCE: 'true',
      MERCADO_OAUTH_REDIRECT_URI: 'https://localhost/callback',
    } as NodeJS.ProcessEnv);
    expect(config.oauthPkce).toBe(true);
    expect(config.oauthRedirectUri).toBe('https://localhost/callback');
  });
});
