import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { PublicacionMercado } from '../../core/models/mercado.model';
import { ObservacionMercado } from '../../core/models/producto.model';
import { MercadoStore } from '../../data/mercado-store.service';
import { calcularEstadisticasMercado } from '../../domain/market/market-stats';
import { extraerItemIdDeUrl } from '../../domain/market/extraer-item-id';
import { publicacionAObservacion } from '../../domain/market/observaciones-mercado';
import { ImportePipe } from '../../shared/pipes/formato.pipe';

/**
 * Búsqueda AUTOMÁTICA de precios en fuentes externas (hoy Mercado Libre, vía backend propio).
 * Si no hay fuente configurada lo informa de forma explícita: nunca muestra datos ficticios.
 */
@Component({
  selector: 'app-busqueda-mercado',
  standalone: true,
  imports: [ImportePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-slate-900">Buscar precios de mercado</h3>
        <span class="text-xs text-slate-500">Fuente: {{ store.fuenteNombre }}</span>
      </div>

      @if (!store.configurada) {
        <p class="mt-2 text-sm text-slate-600">
          La búsqueda automática no está configurada todavía. Cargá los precios a mano como
          referencia o configurá la fuente de mercado.
        </p>
      } @else {
        <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-semibold text-slate-800">Traer precio de un link</p>
          <p class="mt-0.5 text-xs text-slate-500">
            Pegá el link de una publicación de Mercado Libre y traemos su precio.
          </p>
          <div class="mt-2 flex flex-wrap items-end gap-2">
            <label class="block flex-1 text-sm">
              <span class="text-slate-700">Link de la publicación</span>
              <input
                type="url"
                class="mt-1 w-full input"
                placeholder="https://www.mercadolibre.com.ar/..."
                [value]="urlPublicacion()"
                (input)="urlPublicacion.set(aTexto($event))"
              />
            </label>
            <button
              type="button"
              class="btn-secondary"
              [disabled]="store.consultando()"
              (click)="traerDeUrl()"
            >
              {{ store.consultando() ? 'Trayendo…' : 'Traer precio' }}
            </button>
          </div>
          @if (errorUrl()) {
            <p class="mt-2 text-xs text-rose-700">{{ errorUrl() }}</p>
          }
        </div>

        <div class="mt-3 flex flex-wrap items-end gap-2">
          <label class="block text-sm">
            <span class="text-slate-700">O buscá por nombre</span>
            <input
              type="text"
              class="mt-1 w-72 input"
              placeholder="Ej.: iPhone 13 128GB"
              [value]="termino()"
              (input)="termino.set(aTexto($event))"
            />
          </label>
          <button
            type="button"
            class="btn-primary"
            [disabled]="store.consultando()"
            (click)="buscar()"
          >
            {{ store.consultando() ? 'Buscando…' : 'Buscar' }}
          </button>
        </div>

        @if (error()) {
          <p class="mt-2 text-xs text-red-600">{{ error() }}</p>
        }

        @if (!store.consultando() && store.estado() !== 'ok') {
          <p class="mt-2 text-sm text-slate-600">{{ mensajeEstado() }}</p>
        }

        @if (desactualizado()) {
          <p class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Estos resultados pueden estar desactualizados. Volvé a buscar para refrescarlos.
          </p>
        }

        @if (store.publicaciones().length > 0) {
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {{ store.publicaciones().length }} encontrada(s) de {{ store.total() }} coincidencia(s) ·
              {{ store.seleccionadas().size }} para usar
            </span>
            <span class="flex gap-2">
              <button type="button" class="hover:underline" (click)="store.seleccionarTodas()">
                Seleccionar todas
              </button>
              <button type="button" class="hover:underline" (click)="store.limpiarSeleccion()">
                Quitar todas
              </button>
            </span>
          </div>

          <div class="mt-2 max-h-72 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">
            @for (p of store.publicaciones(); track p.id) {
              <label class="flex items-start gap-3 p-3 text-sm">
                <input
                  type="checkbox"
                  class="mt-1"
                  [checked]="store.seleccionadas().has(p.id)"
                  (change)="store.alternarSeleccion(p.id)"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium text-slate-900">{{ p.titulo }}</span>
                  <span class="mt-0.5 block text-slate-600">
                    {{ p.precio | importe: p.moneda }}
                    · {{ etiquetaEnvio(p) }}
                    · {{ etiquetaCondicion(p) }}
                  </span>
                  @if (p.url) {
                    <a
                      class="mt-0.5 inline-block text-xs text-brand-700 hover:underline"
                      [href]="p.url"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver publicación
                    </a>
                  }
                </span>
                @if (!p.disponible) {
                  <span class="text-xs text-slate-400">No disponible</span>
                }
              </label>
            }
          </div>

          @if (estadisticas().cantidad > 0) {
            <div class="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <div>
                <p class="text-xs text-slate-500">Mínimo (selección)</p>
                <p class="font-medium">{{ estadisticas().minimo | importe: monedaSalida() }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Máximo (selección)</p>
                <p class="font-medium">{{ estadisticas().maximo | importe: monedaSalida() }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Mediana (selección)</p>
                <p class="font-medium">{{ estadisticas().mediana | importe: monedaSalida() }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Muestra suficiente</p>
                <p class="font-medium" [class.text-amber-700]="!estadisticas().suficiente">
                  {{ estadisticas().suficiente ? 'Sí' : 'No' }}
                </p>
              </div>
            </div>
          }

          <div class="mt-3 flex justify-end">
            <button
              type="button"
              class="btn-secondary"
              [disabled]="!store.haySeleccion()"
              (click)="usarSeleccionadas()"
            >
              Usar seleccionadas ({{ store.seleccionadas().size }})
            </button>
          </div>
        }
      }
    </section>
  `,
})
export class BusquedaMercadoComponent {
  readonly store = inject(MercadoStore);

  readonly nombre = input<string | null>(null);
  readonly marca = input<string | null>(null);
  readonly modelo = input<string | null>(null);
  readonly minimoObservaciones = input(3);
  readonly maxDiasMuestra = input(30);

  readonly usar = output<ObservacionMercado[]>();

  readonly termino = signal<string>('');
  readonly urlPublicacion = signal<string>('');
  readonly errorUrl = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly consultadoEn = this.store.consultadoEn;

  readonly estadisticas = computed(() =>
    calcularEstadisticasMercado(
      this.store.publicacionesSeleccionadas().map((p) => p.precio),
      this.minimoObservaciones(),
    ),
  );

  readonly desactualizado = computed(() => {
    const fecha = this.consultadoEn();
    if (!fecha) return false;
    const dias = (Date.now() - Date.parse(fecha)) / 86_400_000;
    return Number.isFinite(dias) && dias > this.maxDiasMuestra();
  });

  aTexto(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  private consulta() {
    const partes = [this.nombre(), this.marca(), this.modelo()].filter(
      (v): v is string => typeof v === 'string' && v.trim() !== '',
    );
    return partes.join(' ').trim();
  }

  async buscar(): Promise<void> {
    const q = (this.termino().trim() || this.consulta()).trim();
    if (q === '') {
      this.error.set('Escribí el producto que querés buscar.');
      return;
    }
    this.error.set(null);
    await this.store.buscar({ q, siteId: 'MLA' });
  }

  async traerDeUrl(): Promise<void> {
    this.errorUrl.set(null);
    const id = extraerItemIdDeUrl(this.urlPublicacion());
    if (!id) {
      this.errorUrl.set('No encontré un identificador válido en ese link. Pegá el link completo de la publicación.');
      return;
    }
    await this.store.obtenerItem(id);
  }

  usarSeleccionadas(): void {
    const observaciones = this.store.publicacionesSeleccionadas().map(publicacionAObservacion);
    if (observaciones.length === 0) return;
    this.usar.emit(observaciones);
  }

  mensajeEstado(): string {
    switch (this.store.estado()) {
      case 'sin_resultados':
        return 'No se encontraron publicaciones para esa búsqueda.';
      case 'insuficiente':
        return 'Muy pocos resultados para considerar la muestra suficiente.';
      case 'limite':
        return 'Se alcanzó el límite de consultas de la fuente. Probá más tarde.';
      case 'no_disponible':
        return 'La fuente de mercado no está disponible en este momento.';
      case 'error':
        return 'No se pudo completar la búsqueda.';
      default:
        return this.store.mensaje() ?? '';
    }
  }

  etiquetaEnvio(p: PublicacionMercado): string {
    if (p.envio.tipo === 'gratis') return 'Envío gratis';
    if (p.envio.tipo === 'pago') {
      return p.envio.costo != null ? `Envío ${p.envio.costo}` : 'Envío con costo';
    }
    return 'Envío no informado';
  }

  etiquetaCondicion(p: PublicacionMercado): string {
    return p.condicion === 'desconocida' ? 'Condición desconocida' : p.condicion;
  }

  monedaSalida() {
    return this.store.publicacionesSeleccionadas()[0]?.moneda ?? 'ARS';
  }
}
