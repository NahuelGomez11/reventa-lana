/** Configuracion tipada del backend de mercado, leida del entorno. Nunca contiene defaults secretos. */
export interface MercadoConfig {
  apiBase: string;
  siteId: string;
  clientId: string | null;
  clientSecret: string | null;
  refreshToken: string | null;
  tokenStorePath: string;
  maxResultados: number;
  timeoutMs: number;
  reqPorMinuto: number;
  corsOrigin: string;
  port: number;
  authBase: string;
  oauthRedirectUri: string | null;
  oauthPkce: boolean;
  oauthStateStorePath: string;
}

export const MERCADO_CONFIG = Symbol('MERCADO_CONFIG');

function textoONull(valor: string | undefined): string | null {
  if (typeof valor !== 'string') return null;
  const v = valor.trim();
  return v === '' ? null : v;
}

function numeroPositivo(valor: string | undefined, porDefecto: number): number {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

function booleano(valor: string | undefined, porDefecto: boolean): boolean {
  if (typeof valor !== 'string') return porDefecto;
  const v = valor.trim().toLowerCase();
  if (v === '') return porDefecto;
  return v === 'true' || v === '1' || v === 'yes' || v === 'si' || v === 'sí';
}

/**
 * Lee la configuracion desde variables de entorno.
 * No contiene secretos por defecto; si faltan credenciales la fuente queda "no configurada".
 */
export function leerConfigMercado(env: NodeJS.ProcessEnv = process.env): MercadoConfig {
  return {
    apiBase: (env.MERCADO_API_BASE ?? 'https://api.mercadolibre.com').replace(/\/+$/, ''),
    siteId: env.MERCADO_SITE_ID?.trim() || 'MLA',
    clientId: textoONull(env.MERCADO_CLIENT_ID),
    clientSecret: textoONull(env.MERCADO_CLIENT_SECRET),
    refreshToken: textoONull(env.MERCADO_REFRESH_TOKEN),
    tokenStorePath: env.MERCADO_TOKEN_STORE?.trim() || '.mercado-token.json',
    maxResultados: numeroPositivo(env.MERCADO_MAX_RESULTADOS, 50),
    timeoutMs: numeroPositivo(env.MERCADO_TIMEOUT_MS, 8000),
    reqPorMinuto: numeroPositivo(env.MERCADO_REQ_POR_MINUTO, 60),
    corsOrigin: env.MERCADO_CORS_ORIGIN?.trim() || 'http://localhost:4200',
    port: numeroPositivo(env.PORT, 3000),
    authBase: (env.MERCADO_AUTH_BASE ?? 'https://auth.mercadolibre.com.ar').replace(/\/+$/, ''),
    oauthRedirectUri: textoONull(env.MERCADO_OAUTH_REDIRECT_URI),
    oauthPkce: booleano(env.MERCADO_OAUTH_PKCE, false),
    oauthStateStorePath: env.MERCADO_OAUTH_STATE_STORE?.trim() || '.mercado-oauth-state.json',
  };
}
