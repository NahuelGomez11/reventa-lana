import { Inject, Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { MERCADO_CONFIG, MercadoConfig } from '../../config/mercado.config';
import { FetchLike, HTTP_FETCH } from '../http';

/** No hay client_id/client_secret/refresh_token configurados. */
export class FaltanCredencialesError extends Error {
  constructor() {
    super('Faltan credenciales de Mercado Libre.');
    this.name = 'FaltanCredencialesError';
  }
}

/** Mercado Libre rechazo las credenciales (HTTP 400/401). */
export class CredencialesInvalidasError extends Error {
  constructor() {
    super('Mercado Libre rechazo las credenciales.');
    this.name = 'CredencialesInvalidasError';
  }
}

/** Falla transitoria o respuesta inesperada del servidor de tokens. */
export class FalloTokenError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'FalloTokenError';
  }
}

interface RespuestaToken {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
}

const VALIDEZ_POR_DEFECTO_SEGUNDOS = 21600;

/**
 * Gestiona el OAuth de Mercado Libre SOLO en el backend.
 * - El `client_secret` y el `refresh_token` nunca salen de aqui.
 * - El `refresh_token` puede rotar: se persiste con permisos 600 para no perder el acceso.
 * - No se registran secretos en logs.
 */
@Injectable()
export class TokenService {
  private readonly log = new Logger(TokenService.name);
  private acceso: { token: string; expiraEn: number } | null = null;
  private refresco: string | null = null;
  private refrescoLeido = false;
  /**
   * Renovacion en curso (single-flight). Evita que dos solicitudes simultaneas usen el
   * mismo `refresh_token` a la vez: en Mercado Libre es de un solo uso y rota, por lo que
   * un segundo intento paralelo recibiria `invalid_grant` y romperia la cadena.
   */
  private renovacion: Promise<{ token: string; expiraEn: number }> | null = null;

  constructor(
    @Inject(MERCADO_CONFIG) private readonly config: MercadoConfig,
    @Inject(HTTP_FETCH) private readonly fetch: FetchLike,
  ) {}

  private get tokenUrl(): string {
    return `${this.config.apiBase}/oauth/token`;
  }

  private async refreshTokenActual(): Promise<string | null> {
    if (this.refresco) return this.refresco;
    if (this.refrescoLeido) return this.config.refreshToken;
    this.refrescoLeido = true;
    const delArchivo = await this.leerStore();
    this.refresco = delArchivo ?? this.config.refreshToken;
    return this.refresco;
  }

  async obtenerAccessToken(): Promise<string> {
    if (this.acceso && Date.now() < this.acceso.expiraEn) return this.acceso.token;
    if (!this.renovacion) {
      this.renovacion = this.renovar().finally(() => {
        this.renovacion = null;
      });
    }
    const acceso = await this.renovacion;
    return acceso.token;
  }

  /**
   * Renueva el access token. Se invoca de forma exclusiva (single-flight): comparte la misma
   * promesa entre llamadas concurrentes para no gastar el `refresh_token` mas de una vez.
   */
  private async renovar(): Promise<{ token: string; expiraEn: number }> {
    const refresh = await this.refreshTokenActual();
    if (!this.config.clientId || !this.config.clientSecret || !refresh) {
      throw new FaltanCredencialesError();
    }
    const json = await this.pedirToken({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refresh,
    });
    if (json.refresh_token && json.refresh_token !== refresh) {
      this.refresco = json.refresh_token;
      await this.guardarStore(json.refresh_token);
    }
    this.acceso = {
      token: json.access_token,
      expiraEn: this.calcularExpiracion(json.expires_in),
    };
    this.log.log('Access token de Mercado Libre renovado.');
    return this.acceso;
  }

  /**
   * Canje unico del `code` obtenido al autorizar la app (paso manual de configuracion).
   * Deja persistido el `refresh_token` para que `obtenerAccessToken` funcione luego.
   *
   * `redirectUri` debe coincidir EXACTAMENTE con el registrado en la aplicacion.
   * Si la aplicacion tiene PKCE habilitado, pasar `codeVerifier` (el mismo con el que se
   * genero el `code_challenge` en la URL de autorizacion); en ese caso es obligatorio.
   */
  async canjearCodigoAutorizacion(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<void> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new FaltanCredencialesError();
    }
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: redirectUri,
    };
    if (codeVerifier) body['code_verifier'] = codeVerifier;
    const json = await this.pedirToken(body);
    if (!json.refresh_token) {
      throw new FalloTokenError('La respuesta no incluyo refresh_token.');
    }
    this.refresco = json.refresh_token;
    this.refrescoLeido = true;
    await this.guardarStore(json.refresh_token);
    this.acceso = {
      token: json.access_token,
      expiraEn: this.calcularExpiracion(json.expires_in),
    };
  }

  private async pedirToken(body: Record<string, string>): Promise<RespuestaToken> {
    let resp: Response;
    try {
      resp = await this.fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams(body).toString(),
      });
    } catch {
      throw new FalloTokenError('No se pudo contactar el servidor de tokens de Mercado Libre.');
    }
    if (resp.status === 400 || resp.status === 401) {
      throw new CredencialesInvalidasError();
    }
    if (!resp.ok) {
      throw new FalloTokenError(`El servidor de tokens respondio HTTP ${resp.status}.`);
    }
    let json: unknown;
    try {
      json = await resp.json();
    } catch {
      throw new FalloTokenError('La respuesta de tokens no es un JSON valido.');
    }
    const t = json as Partial<RespuestaToken> | null;
    if (!t || typeof t.access_token !== 'string' || t.access_token === '') {
      throw new FalloTokenError('La respuesta de tokens no incluyo access_token.');
    }
    return t as RespuestaToken;
  }

  private calcularExpiracion(expiresIn?: number): number {
    const seg = typeof expiresIn === 'number' && Number.isFinite(expiresIn)
      ? expiresIn
      : VALIDEZ_POR_DEFECTO_SEGUNDOS;
    return Date.now() + Math.max(60, seg - 60) * 1000;
  }

  private async leerStore(): Promise<string | null> {
    try {
      const texto = await fs.readFile(this.config.tokenStorePath, 'utf8');
      const json = JSON.parse(texto) as { refresh_token?: unknown };
      return typeof json?.refresh_token === 'string' && json.refresh_token !== ''
        ? json.refresh_token
        : null;
    } catch {
      return null;
    }
  }

  private async guardarStore(refreshToken: string): Promise<void> {
    const destino = this.config.tokenStorePath;
    const temporal = `${destino}.tmp-${process.pid}-${Date.now()}`;
    try {
      await fs.mkdir(dirname(destino), { recursive: true });
      // Escritura atomica: se escribe a un temporal y se renombra, para no dejar el store a
      // medio escribir si el proceso se interrumpe.
      await fs.writeFile(temporal, JSON.stringify({ refresh_token: refreshToken }), { mode: 0o600 });
      await fs.rename(temporal, destino);
      await this.restringirPermisos(destino);
    } catch {
      await fs.rm(temporal, { force: true }).catch(() => undefined);
      this.log.warn(
        'No se pudo persistir el refresh token rotativo; seguira solo en memoria hasta reiniciar. ' +
          'Tras reiniciar puede requerirse reautorizar en Mercado Libre.',
      );
    }
  }

  /**
   * Intenta dejar el archivo solo para el usuario (600). En POSIX aplica; en Windows el
   * `mode` de `writeFile`/`chmod` no controla las ACL, asi que el permiso efectivo depende
   * de la carpeta (documentado en docs/INTEGRACION_MERCADO.md).
   */
  private async restringirPermisos(path: string): Promise<void> {
    try {
      await fs.chmod(path, 0o600);
    } catch {
      // Windows u otros sistemas sin permisos POSIX: se ignora a proposito.
    }
  }
}
