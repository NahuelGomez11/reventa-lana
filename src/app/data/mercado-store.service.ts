import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import {
  ConsultaMercado,
  EstadoBusquedaMercado,
  PublicacionMercado,
} from '../core/models/mercado.model';
import { FuenteMercado } from '../domain/market/fuente-mercado';
import { FuenteMercadoNula } from './adapters/fuente-mercado-http';

/** URL completa del endpoint de búsqueda del backend propio. null = no configurado. */
export const MERCADO_BASE_URL = new InjectionToken<string | null>('MERCADO_BASE_URL', {
  providedIn: 'root',
  factory: () => null,
});

/**
 * Fuente de mercado activa. Por defecto no hay backend configurado; la app queda en
 * estado "no configurado" y nunca muestra datos ficticios.
 */
export const FUENTE_MERCADO = new InjectionToken<FuenteMercado>('FUENTE_MERCADO', {
  providedIn: 'root',
  factory: () => new FuenteMercadoNula(),
});

/** Estado de la última búsqueda de mercado y selección del usuario. */
@Injectable({ providedIn: 'root' })
export class MercadoStore {
  private readonly fuente = inject(FUENTE_MERCADO);

  readonly fuenteId = this.fuente.id;
  readonly fuenteNombre = this.fuente.nombre;
  readonly configurada = this.fuente.configurada;

  readonly consultando = signal(false);
  readonly estado = signal<EstadoBusquedaMercado>('no_configurado');
  readonly publicaciones = signal<PublicacionMercado[]>([]);
  readonly total = signal(0);
  readonly consultadoEn = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  private readonly _seleccionadas = signal<ReadonlySet<string>>(new Set());

  readonly seleccionadas = this._seleccionadas.asReadonly();
  readonly publicacionesSeleccionadas = computed(() =>
    this.publicaciones().filter((p) => this._seleccionadas().has(p.id)),
  );
  readonly haySeleccion = computed(() => this._seleccionadas().size > 0);

  async buscar(consulta: ConsultaMercado): Promise<void> {
    if (!this.configurada) {
      this.estado.set('no_configurado');
      this.publicaciones.set([]);
      this.total.set(0);
      this.consultadoEn.set(null);
      this.mensaje.set(
        'La búsqueda automática no está configurada. Cargá observaciones manuales o configurá la fuente de mercado.',
      );
      this._seleccionadas.set(new Set());
      return;
    }
    this.consultando.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    try {
      const resultado = await this.fuente.buscar(consulta);
      this.estado.set(resultado.estado);
      this.publicaciones.set(resultado.publicaciones);
      this.total.set(resultado.total);
      this.consultadoEn.set(resultado.consultadoEn);
      this.mensaje.set(resultado.mensaje);
      this._seleccionadas.set(new Set(resultado.publicaciones.map((p) => p.id)));
    } catch {
      this.estado.set('error');
      this.publicaciones.set([]);
      this.total.set(0);
      this.consultadoEn.set(null);
      this.error.set('No se pudo consultar la fuente de mercado.');
      this._seleccionadas.set(new Set());
    } finally {
      this.consultando.set(false);
    }
  }

  async obtenerItem(itemId: string): Promise<void> {
    if (!this.configurada) {
      this.estado.set('no_configurado');
      this.publicaciones.set([]);
      this.total.set(0);
      this.consultadoEn.set(null);
      this.mensaje.set(
        'La búsqueda automática no está configurada. Cargá observaciones manuales o configurá la fuente de mercado.',
      );
      this._seleccionadas.set(new Set());
      return;
    }
    this.consultando.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    try {
      const resultado = await this.fuente.obtenerItem(itemId);
      this.estado.set(resultado.estado);
      this.publicaciones.set(resultado.publicaciones);
      this.total.set(resultado.total);
      this.consultadoEn.set(resultado.consultadoEn);
      this.mensaje.set(resultado.mensaje);
      this._seleccionadas.set(new Set(resultado.publicaciones.map((p) => p.id)));
    } catch {
      this.estado.set('error');
      this.publicaciones.set([]);
      this.total.set(0);
      this.consultadoEn.set(null);
      this.error.set('No se pudo consultar la fuente de mercado.');
      this._seleccionadas.set(new Set());
    } finally {
      this.consultando.set(false);
    }
  }

  alternarSeleccion(id: string): void {
    this._seleccionadas.update((actual) => {
      const copia = new Set(actual);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  seleccionarTodas(): void {
    this._seleccionadas.set(new Set(this.publicaciones().map((p) => p.id)));
  }

  limpiarSeleccion(): void {
    this._seleccionadas.set(new Set());
  }

  limpiar(): void {
    this.publicaciones.set([]);
    this.total.set(0);
    this.consultadoEn.set(null);
    this.mensaje.set(null);
    this.error.set(null);
    this.estado.set(this.configurada ? 'sin_resultados' : 'no_configurado');
    this._seleccionadas.set(new Set());
  }
}
