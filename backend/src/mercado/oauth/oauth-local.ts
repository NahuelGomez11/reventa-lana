import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { MercadoConfig, leerConfigMercado } from '../../config/mercado.config';
import { FetchLike } from '../http';
import { TokenService } from './token.service';

/** Una autorizacion OAuth pendiente caduca a los 10 minutos. */
export const TTL_ESTADO_MS = 10 * 60 * 1000;

export interface EstadoOAuth {
  state: string;
  codeVerifier: string | null;
  creadoEn: number;
}

export interface DatosCallback {
  code: string | null;
  state: string | null;
  error: string | null;
}

function base64Url(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

/** `state` aleatorio e irrepetible para proteger contra CSRF. */
export function generarState(): string {
  return base64Url(32);
}

/** `code_verifier` para PKCE (43 chars base64url, dentro del rango permitido). */
export function generarCodeVerifier(): string {
  return base64Url(32);
}

/** `code_challenge` = BASE64URL(SHA256(code_verifier)) — metodo S256. */
export function desafioS256(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

/**
 * Construye la URL de autorizacion de Mercado Libre.
 * Si se pasa `codeChallenge`, agrega los parametros PKCE (metodo S256).
 */
export function construirUrlAutorizacion(opciones: {
  authBase: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge?: string | null;
}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: opciones.clientId,
    state: opciones.state,
    redirect_uri: opciones.redirectUri,
  });
  if (opciones.codeChallenge) {
    params.set('code_challenge', opciones.codeChallenge);
    params.set('code_challenge_method', 'S256');
  }
  return `${opciones.authBase.replace(/\/+$/, '')}/authorization?${params.toString()}`;
}

/**
 * Acepta la URL completa de redireccion, la query string o un `code` suelto.
 * No interpreta ni imprime el resto de los parametros.
 */
export function parsearCallback(entrada: string): DatosCallback {
  const texto = (entrada ?? '').trim();
  if (texto === '') return { code: null, state: null, error: null };
  const comoQuery = texto.includes('?') ? texto.slice(texto.indexOf('?') + 1) : texto;
  if (!comoQuery.includes('=')) {
    return { code: texto, state: null, error: null };
  }
  const params = new URLSearchParams(comoQuery);
  return {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
  };
}

/** Compara el `state` esperado con el recibido en tiempo constante. */
export function estadoCoincide(esperado: string | null, recibido: string | null): boolean {
  if (!esperado || !recibido) return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recibido);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function estadoVigente(creadoEn: number, ahora = Date.now()): boolean {
  return Number.isFinite(creadoEn) && ahora - creadoEn >= 0 && ahora - creadoEn <= TTL_ESTADO_MS;
}

async function restringirPermisos(path: string): Promise<void> {
  try {
    await fs.chmod(path, 0o600);
  } catch {
    // Windows u otros sistemas sin permisos POSIX.
  }
}

export async function guardarEstado(path: string, estado: EstadoOAuth): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(estado), { mode: 0o600 });
  await restringirPermisos(path);
}

export async function leerEstado(path: string): Promise<EstadoOAuth | null> {
  try {
    const json = JSON.parse(await fs.readFile(path, 'utf8')) as Partial<EstadoOAuth>;
    if (typeof json?.state !== 'string' || json.state === '') return null;
    return {
      state: json.state,
      codeVerifier: typeof json.codeVerifier === 'string' ? json.codeVerifier : null,
      creadoEn: typeof json.creadoEn === 'number' ? json.creadoEn : 0,
    };
  } catch {
    return null;
  }
}

export async function borrarEstado(path: string): Promise<void> {
  await fs.rm(path, { force: true }).catch(() => undefined);
}

async function existeArchivo(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

const fetchImpl: FetchLike = (input, init) => fetch(input, init);

function mostrar(mensaje: string): void {
  process.stdout.write(`${mensaje}\n`);
}

function falta(mensaje: string): never {
  process.stderr.write(`${mensaje}\n`);
  process.exit(1);
}

function requerirCredenciales(config: MercadoConfig): void {
  if (!config.clientId || !config.clientSecret) {
    falta(
      'Faltan MERCADO_CLIENT_ID y/o MERCADO_CLIENT_SECRET. Configure backend/.env antes de continuar.',
    );
  }
  if (!config.oauthRedirectUri) {
    falta(
      'Falta MERCADO_OAUTH_REDIRECT_URI. Debe ser exactamente la URI HTTPS registrada en la aplicacion.',
    );
  }
}

async function iniciar(config: MercadoConfig): Promise<void> {
  requerirCredenciales(config);
  const state = generarState();
  const codeVerifier = config.oauthPkce ? generarCodeVerifier() : null;
  const codeChallenge = codeVerifier ? desafioS256(codeVerifier) : null;
  await guardarEstado(config.oauthStateStorePath, { state, codeVerifier, creadoEn: Date.now() });
  const url = construirUrlAutorizacion({
    authBase: config.authBase,
    clientId: config.clientId as string,
    redirectUri: config.oauthRedirectUri as string,
    state,
    codeChallenge,
  });
  mostrar('1) Abre esta URL en el navegador e inicia sesion con tu cuenta de Mercado Libre:');
  mostrar('');
  mostrar(url);
  mostrar('');
  mostrar(
    config.oauthPkce
      ? '2) Esta app usa PKCE. Tras autorizar, el navegador sera redirigido a tu redirect_uri con "?code=...&state=...".'
      : '2) Tras autorizar, el navegador sera redirigido a tu redirect_uri con "?code=...&state=...".',
  );
  mostrar('   Copia la URL completa de la barra de direcciones (aunque la pagina no cargue).');
  mostrar('3) Ejecuta:  npm run auth:canjear -- "<URL de redireccion>"');
  mostrar('   (no compartas esa URL: contiene el codigo de autorizacion de un solo uso).');
}

async function canjear(config: MercadoConfig, entrada: string | undefined): Promise<void> {
  requerirCredenciales(config);
  if (!entrada) {
    falta('Uso: node dist/mercado/oauth/oauth-local.js canjear "<url-de-redireccion-o-code>"');
  }
  const guardado = await leerEstado(config.oauthStateStorePath);
  if (!guardado) {
    falta('No hay una autorizacion en curso. Ejecuta primero el comando "iniciar".');
  }
  if (!estadoVigente(guardado.creadoEn)) {
    await borrarEstado(config.oauthStateStorePath);
    falta('La autorizacion expiro (mas de 10 minutos). Vuelve a ejecutar "iniciar".');
  }
  const datos = parsearCallback(entrada);
  if (datos.error) {
    falta(`Mercado Libre devolvio un error de autorizacion: ${datos.error}.`);
  }
  if (!datos.code) {
    falta('No se encontro el parametro "code" en la URL de redireccion.');
  }
  if (!estadoCoincide(guardado.state, datos.state)) {
    falta('El parametro "state" no coincide: posible CSRF. No se canjea el codigo.');
  }

  const tokens = new TokenService(config, fetchImpl);
  try {
    await tokens.canjearCodigoAutorizacion(
      datos.code,
      config.oauthRedirectUri as string,
      guardado.codeVerifier ?? undefined,
    );
  } catch (e) {
    falta(
      `No se pudo canjear el codigo: ${e instanceof Error ? e.message : 'error desconocido'}. ` +
        'Revisa MERCADO_CLIENT_ID/SECRET y que el redirect_uri coincida exactamente.',
    );
  }
  await borrarEstado(config.oauthStateStorePath);
  mostrar(
    'Autorizacion completada. El refresh_token quedo guardado en MERCADO_TOKEN_STORE (no se muestra).',
  );
  mostrar('Ya puedes iniciar el backend y buscar publicaciones.');
}

async function estado(config: MercadoConfig): Promise<void> {
  const [store, oauth] = await Promise.all([
    existeArchivo(config.tokenStorePath),
    leerEstado(config.oauthStateStorePath),
  ]);
  mostrar(`MERCADO_CLIENT_ID: ${config.clientId ? 'configurado' : 'falta'}`);
  mostrar(`MERCADO_CLIENT_SECRET: ${config.clientSecret ? 'configurado' : 'falta'}`);
  mostrar(`MERCADO_OAUTH_REDIRECT_URI: ${config.oauthRedirectUri ? 'configurado' : 'falta'}`);
  mostrar(`MERCADO_OAUTH_PKCE: ${config.oauthPkce ? 'activado' : 'desactivado'}`);
  mostrar(`Refresh token en entorno: ${config.refreshToken ? 'si' : 'no'}`);
  mostrar(`Store de token: ${store ? 'presente' : 'ausente'}`);
  mostrar(`Autorizacion pendiente: ${oauth ? 'si' : 'no'}`);
}

async function main(): Promise<void> {
  const config = leerConfigMercado();
  const comando = (process.argv[2] ?? '').trim().toLowerCase();
  if (comando === 'iniciar') return iniciar(config);
  if (comando === 'canjear') return canjear(config, process.argv[3]);
  if (comando === 'estado') return estado(config);
  mostrar('Uso: oauth-local <iniciar|canjear "<url>"|estado>');
}

if (require.main === module) {
  void main().catch((e) => {
    process.stderr.write(`Error: ${e instanceof Error ? e.message : 'desconocido'}\n`);
    process.exit(1);
  });
}
