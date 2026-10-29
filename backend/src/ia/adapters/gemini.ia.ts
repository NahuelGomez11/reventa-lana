import { Inject, Injectable } from '@nestjs/common';
import { HTTP_FETCH, FetchLike } from '../../mercado/http';
import { IA_CONFIG, IaConfig } from '../ia.config';
import { EntradaResumen, IaProvider, ResumenIa } from '../ia.port';
import { promptSistema, promptUsuario } from '../prompt-resumen';

function esRegistro(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Extrae el texto concatenado de la primera respuesta del candidato. */
function extraerTexto(crudo: unknown): string | null {
  if (!esRegistro(crudo)) return null;
  const candidatos = crudo['candidates'];
  if (!Array.isArray(candidatos) || candidatos.length === 0) return null;
  const primero = candidatos[0];
  if (!esRegistro(primero) || !esRegistro(primero['content'])) return null;
  const partes = primero['content']['parts'];
  if (!Array.isArray(partes)) return null;
  const textos = partes
    .filter((p): p is Record<string, unknown> => esRegistro(p) && typeof p['text'] === 'string')
    .map((p) => p['text'] as string);
  const unido = textos.join('').trim();
  return unido === '' ? null : unido;
}

/** Extrae las URLs de fuente citadas por el grounding (web.uri). */
function extraerFuentes(crudo: unknown): string[] {
  if (!esRegistro(crudo)) return [];
  const candidatos = crudo['candidates'];
  if (!Array.isArray(candidatos) || candidatos.length === 0) return [];
  const primero = candidatos[0];
  if (!esRegistro(primero) || !esRegistro(primero['groundingMetadata'])) return [];
  const chunks = primero['groundingMetadata']['groundingChunks'];
  if (!Array.isArray(chunks)) return [];
  const urls = chunks
    .map((c: unknown) =>
      esRegistro(c) && esRegistro(c['web']) && typeof c['web']['uri'] === 'string' ? c['web']['uri'] : null,
    )
    .filter((u): u is string => u != null && u.trim() !== '');
  return Array.from(new Set(urls));
}

/**
 * Proveedor de IA Gemini (Google AI Studio). Usa "Grounding with Google Search"
 * para que el resumen se base en resultados reales y devuelva sus fuentes.
 *
 * La IA NO trae precios propios: solo resume las publicaciones que le entrega el backend.
 * La API key nunca se expone en la respuesta ni en logs.
 */
@Injectable()
export class GeminiIaProvider implements IaProvider {
  readonly id = 'gemini' as const;

  constructor(
    @Inject(IA_CONFIG) private readonly config: IaConfig,
    @Inject(HTTP_FETCH) private readonly fetch: FetchLike,
  ) {}

  get configurada(): boolean {
    return this.config.proveedor === 'gemini' && this.config.geminiApiKey != null;
  }

  async resumir(entrada: EntradaResumen): Promise<ResumenIa> {
    if (!this.configurada || this.config.geminiApiKey == null) {
      return {
        proveedor: null,
        resumen: null,
        fuentes: [],
        idsAgrupados: [],
        estado: 'no_configurado',
        mensaje: 'La capa de IA no esta configurada (falta IA_PROVEEDOR=gemini y GEMINI_API_KEY).',
      };
    }

    const cuerpo: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: promptSistema() }] },
      contents: [{ role: 'user', parts: [{ text: promptUsuario(entrada) }] }],
    };
    if (this.config.geminiBusquedaWeb) {
      cuerpo['tools'] = [{ google_search: {} }];
    }

    const url = `${this.config.geminiApiBase}/v1beta/models/${encodeURIComponent(this.config.geminiModelo)}:generateContent`;

    const respuesta = await this.pedirConReintentos(url, cuerpo);
    if (respuesta.error != null) {
      return respuesta.error;
    }

    const crudo = respuesta.crudo;
    const resumen = extraerTexto(crudo);
    if (resumen == null) {
      return this.error('El proveedor de IA no devolvio texto utilizable.');
    }

    return {
      proveedor: 'gemini',
      resumen,
      fuentes: extraerFuentes(crudo),
      idsAgrupados: entrada.publicaciones.map((p) => p.id),
      estado: 'ok',
      mensaje: null,
    };
  }

  /**
   * Llama al proveedor reintentando ante 503/500 (respuestas transitorias tipicas de Gemini).
   * Un unico reintento no basta: el proveedor puede tardar en recuperarse.
   */
  private async pedirConReintentos(
    url: string,
    cuerpo: Record<string, unknown>,
  ): Promise<{ crudo?: unknown; error?: ResumenIa }> {
    const intentos = Math.max(1, this.config.reintentos);
    let ultimo: ResumenIa | null = null;
    for (let i = 1; i <= intentos; i++) {
      let resp: Response;
      try {
        resp = await this.fetch(url, {
          method: 'POST',
          headers: {
            'x-goog-api-key': this.config.geminiApiKey as string,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(cuerpo),
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });
      } catch {
        ultimo = this.error('No se pudo contactar el proveedor de IA (red o tiempo de espera).');
        continue;
      }

      if (resp.status === 429) {
        ultimo = this.error('El proveedor de IA alcanzo su limite de uso. Proba mas tarde.');
        break;
      }
      if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
        return { error: this.error('El proveedor de IA rechazo la solicitud (API key o configuracion).') };
      }
      if (resp.status === 404) {
        return {
          error: this.error(
            `El modelo "${this.config.geminiModelo}" no existe o no admite generar contenido. Ajusta GEMINI_MODELO.`,
          ),
        };
      }
      if (resp.status === 503 || resp.status >= 500) {
        ultimo = this.error('El proveedor de IA esta saturado en este momento (HTTP 503).');
        continue;
      }
      if (!resp.ok) {
        return { error: this.error(`El proveedor de IA respondio HTTP ${resp.status}.`) };
      }

      try {
        const crudo = (await resp.json()) as unknown;
        return { crudo };
      } catch {
        return { error: this.error('El proveedor de IA devolvio una respuesta no valida.') };
      }
    }
    return { error: ultimo ?? this.error('El proveedor de IA no respondio.') };
  }

  private error(mensaje: string): ResumenIa {
    return { proveedor: null, resumen: null, fuentes: [], idsAgrupados: [], estado: 'error', mensaje };
  }
}
