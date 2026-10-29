import { Injectable, signal } from '@angular/core';
import {
  RECARGOS_DEFECTO,
  RecargosConfig,
  RecargoGama,
} from '../core/models/recargos.model';

export const CLAVE_RECARGOS_LOCAL = 'reventa.intelligence.recargos.v1';

@Injectable({ providedIn: 'root' })
export class RecargosStore {
  private readonly _config = signal<RecargosConfig>(this.clonar(RECARGOS_DEFECTO));
  readonly config = this._config.asReadonly();
  readonly error = signal<string | null>(null);

  cargar(): void {
    this.error.set(null);
    try {
      const crudo = globalThis.localStorage?.getItem(CLAVE_RECARGOS_LOCAL);
      if (crudo == null) {
        // primera vez: cargar valores iniciales
        this._config.set(this.clonar(RECARGOS_DEFECTO));
        return;
      }
      const parseado = JSON.parse(crudo) as Partial<RecargosConfig>;
      this._config.set(this.normalizar(parseado));
    } catch {
      this.error.set('No se pudo leer la configuración de recargos; se usan los valores por defecto.');
    }
  }

  async guardar(config: RecargosConfig): Promise<void> {
    this.error.set(null);
    const normalizada = this.normalizar(config);
    try {
      globalThis.localStorage?.setItem(CLAVE_RECARGOS_LOCAL, JSON.stringify(normalizada));
    } catch {
      this.error.set('No se pudo guardar la configuración de recargos.');
      throw new Error('No se pudo guardar la configuración de recargos.');
    }
    this._config.set(normalizada);
  }

  restaurarPredeterminados(): void {
    try {
      globalThis.localStorage?.removeItem(CLAVE_RECARGOS_LOCAL);
    } catch {
      // ignore
    }
    this._config.set(this.clonar(RECARGOS_DEFECTO));
  }

  /** Porcentaje configurado para una categoría y gama. Null si no hay config válida. */
  porcentajePara(categoria: string, gama: string | null | undefined): number | null {
    const cat = categoria?.trim();
    if (!cat) return null;
    const g = (gama ?? '').toLowerCase();
    if (g !== 'baja' && g !== 'media' && g !== 'alta') return null;
    const rec = this._config().categorias[cat];
    if (!rec) return null;
    const valor = rec[g as keyof RecargoGama];
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) return null;
    return valor;
  }

  private normalizar(parcial: Partial<RecargosConfig>): RecargosConfig {
    const base: RecargosConfig = { categorias: {} };
    const cats = parcial?.categorias;
    if (cats && typeof cats === 'object') {
      for (const [nombre, val] of Object.entries(cats)) {
        const n = nombre.trim();
        if (!n) continue;
        if (!val || typeof val !== 'object') continue;
        const r = val as Partial<RecargoGama>;
        const baja = this.aNum(r.baja);
        const media = this.aNum(r.media);
        const alta = this.aNum(r.alta);
        if (baja == null || media == null || alta == null) continue;
        base.categorias[n] = { baja, media, alta };
      }
    }
    // si quedó vacío, usar defaults
    if (Object.keys(base.categorias).length === 0) {
      return this.clonar(RECARGOS_DEFECTO);
    }
    return base;
  }

  private aNum(v: unknown): number | null {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
    return v;
  }

  private clonar(c: RecargosConfig): RecargosConfig {
    return { categorias: { ...c.categorias } };
  }
}
