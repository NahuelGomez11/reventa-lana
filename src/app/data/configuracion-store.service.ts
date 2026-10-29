import { Injectable, signal } from '@angular/core';
import {
  CONFIGURACION_DEFECTO,
  Configuracion,
} from '../core/models/configuracion.model';

export const CLAVE_CONFIGURACION_LOCAL = 'reventa.intelligence.configuracion.v1';

/**
 * Configuración de la aplicación (capital, moneda y umbrales de riesgo).
 * ALMACENAMIENTO LOCAL Y TEMPORAL en el navegador. Sin backend.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionStore {
  private readonly _configuracion = signal<Configuracion>({
    ...CONFIGURACION_DEFECTO,
    umbrales: { ...CONFIGURACION_DEFECTO.umbrales },
  });

  readonly configuracion = this._configuracion.asReadonly();
  readonly error = signal<string | null>(null);

  cargar(): void {
    this.error.set(null);
    try {
      const crudo = globalThis.localStorage?.getItem(CLAVE_CONFIGURACION_LOCAL);
      if (crudo == null) return;
      const parseado = JSON.parse(crudo) as Partial<Configuracion>;
      this._configuracion.set(this.normalizar(parseado));
    } catch {
      this.error.set(
        'No se pudo leer la configuración local; se mantienen los valores por defecto.',
      );
    }
  }

  async guardar(config: Configuracion): Promise<void> {
    this.error.set(null);
    const normalizada = this.normalizar(config);
    try {
      globalThis.localStorage?.setItem(CLAVE_CONFIGURACION_LOCAL, JSON.stringify(normalizada));
    } catch {
      this.error.set('No se pudo guardar la configuración local.');
      throw new Error('No se pudo guardar la configuración local.');
    }
    this._configuracion.set(normalizada);
  }

  private normalizar(parcial: Partial<Configuracion>): Configuracion {
    const base: Configuracion = {
      capitalDisponible:
        typeof parcial.capitalDisponible === 'number' && Number.isFinite(parcial.capitalDisponible)
          ? parcial.capitalDisponible
          : CONFIGURACION_DEFECTO.capitalDisponible,
      moneda: parcial.moneda === 'USD' ? 'USD' : parcial.moneda === 'ARS' ? 'ARS' : 'ARS',
      umbrales: { ...CONFIGURACION_DEFECTO.umbrales },
    };
    const u = parcial.umbrales;
    if (u) {
      if (typeof u.margenMinimoPct === 'number' && Number.isFinite(u.margenMinimoPct)) {
        base.umbrales.margenMinimoPct = u.margenMinimoPct;
      }
      if (
        typeof u.capitalComprometidoMaxPct === 'number' &&
        Number.isFinite(u.capitalComprometidoMaxPct)
      ) {
        base.umbrales.capitalComprometidoMaxPct = u.capitalComprometidoMaxPct;
      }
      if (
        typeof u.desviacionPrecioMercadoPct === 'number' &&
        Number.isFinite(u.desviacionPrecioMercadoPct)
      ) {
        base.umbrales.desviacionPrecioMercadoPct = u.desviacionPrecioMercadoPct;
      }
      if (typeof u.minObservacionesMercado === 'number' && Number.isFinite(u.minObservacionesMercado)) {
        base.umbrales.minObservacionesMercado = Math.max(1, Math.round(u.minObservacionesMercado));
      }
    }
    return base;
  }
}
