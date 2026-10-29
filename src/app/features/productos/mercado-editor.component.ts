import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Moneda } from '../../core/models/analisis.model';
import { CondicionProducto, ObservacionMercado } from '../../core/models/producto.model';
import { ahoraIso, nuevoId } from '../../core/utils/id';
import { calcularEstadisticasMercado } from '../../domain/market/market-stats';
import { ImportePipe, FechaPipe } from '../../shared/pipes/formato.pipe';

export const ETIQUETAS_CONDICION: Record<CondicionProducto, string> = {
  nuevo: 'Nuevo',
  usado: 'Usado',
  reacondicionado: 'Reacondicionado',
  desconocida: 'Desconocida',
};

/**
 * Observaciones de mercado cargadas MANUALMENTE por el usuario.
 * No hay scraping ni integración externa: los precios son datos que vos registrás.
 */
@Component({
  selector: 'app-mercado-editor',
  standalone: true,
  imports: [ImportePipe, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-slate-900">Precios que viste en otros lugares</h2>
        <span class="text-xs text-slate-500">
          {{ observaciones().length }} observación(es) · mínimo para confiar:
          {{ minimoObservaciones() }}
        </span>
      </div>

      @if (estadisticas().cantidad === 0) {
        <p class="mt-2 text-sm text-slate-600">
          Sin observaciones. Cargá precios reales que veas en el mercado (nunca el tuyo propio).
        </p>
      } @else {
        <div class="mt-3 grid gap-2 text-sm sm:grid-cols-5">
          <div>
            <p class="text-xs text-slate-500">Mínimo</p>
            <p class="font-medium">{{ estadisticas().minimo | importe: moneda() }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Máximo</p>
            <p class="font-medium">{{ estadisticas().maximo | importe: moneda() }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Media</p>
            <p class="font-medium">{{ estadisticas().media | importe: moneda() }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Mediana</p>
            <p class="font-medium">{{ estadisticas().mediana | importe: moneda() }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Suficiente</p>
            <p class="font-medium" [class.text-amber-700]="!estadisticas().suficiente">
              {{ estadisticas().suficiente ? 'Sí' : 'No' }}
            </p>
          </div>
        </div>

        <div class="mt-3 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-2 py-1 text-left font-medium">Precio</th>
                <th class="px-2 py-1 text-left font-medium">Dónde</th>
                <th class="px-2 py-1 text-left font-medium">Condición</th>
                <th class="px-2 py-1 text-left font-medium">Notas</th>
                <th class="px-2 py-1 text-left font-medium">Fecha</th>
                <th class="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              @for (o of observaciones(); track o.id) {
                <tr class="border-t">
                  <td class="px-2 py-1 font-medium">{{ o.precio | importe: moneda() }}</td>
                  <td class="px-2 py-1">
                    <span class="block">{{ o.vendedor || '—' }}</span>
                    @if (o.url) {
                      <a [href]="o.url" target="_blank" rel="noopener noreferrer" class="block truncate text-xs text-brand-700 hover:underline">
                        {{ o.url }}
                      </a>
                    }
                  </td>
                  <td class="px-2 py-1">{{ etiquetaCondicion(o.condicion) }}</td>
                  <td class="px-2 py-1 text-slate-600">{{ o.caracteristicas || '—' }}</td>
                  <td class="px-2 py-1 text-slate-600">{{ o.fechaConsulta | fecha }}</td>
                  <td class="px-2 py-1 text-right">
                    <button class="text-xs text-red-700 hover:underline" (click)="quitar(o.id)">
                      Quitar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <div class="mt-4 grid gap-2 border-t pt-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <label class="block">
          <span class="text-slate-700">Precio observado ({{ moneda() }})</span>
          <input
            type="number"
            class="mt-1 w-full input"
            [value]="borradorPrecio()"
            (input)="borradorPrecio.set(aNumero($event))"
          />
        </label>
          <label class="block">
            <span class="text-slate-700">Dónde lo viste</span>
            <input
              type="text"
              class="mt-1 w-full input"
              placeholder="Ej.: Mercado Libre, tienda, Facebook"
              [value]="borradorLugar()"
              (input)="borradorLugar.set(aTexto($event))"
            />
          </label>
          <label class="block lg:col-span-2">
            <span class="text-slate-700">Link de referencia (opcional)</span>
            <input
              type="url"
              class="mt-1 w-full input"
              placeholder="https://..."
              [value]="borradorUrl()"
              (input)="borradorUrl.set(aTexto($event))"
            />
          </label>
        <label class="block">
          <span class="text-slate-700">Condición</span>
          <select
            class="mt-1 w-full input"
            [value]="borradorCondicion()"
            (change)="borradorCondicion.set(aCondicion($event))"
          >
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
            <option value="reacondicionado">Reacondicionado</option>
            <option value="desconocida">Desconocida</option>
          </select>
        </label>
        <label class="block lg:col-span-2">
          <span class="text-slate-700">Características / aclaraciones</span>
          <input
            type="text"
            class="mt-1 w-full input"
            placeholder="Ej.: incluye envío, sin caja, 64GB"
            [value]="borradorCaracteristicas()"
            (input)="borradorCaracteristicas.set(aTexto($event))"
          />
        </label>
        <div class="flex items-end">
          <button
            type="button"
            class="btn-primary"
            (click)="agregar()"
          >
            Agregar observación
          </button>
        </div>
      </div>

      @if (error()) {
        <p class="mt-2 text-xs text-red-600">{{ error() }}</p>
      }
    </section>
  `,
})
export class MercadoEditorComponent {
  readonly observaciones = input.required<ObservacionMercado[]>();
  readonly moneda = input<Moneda>('ARS');
  readonly minimoObservaciones = input(3);
  readonly cambio = output<ObservacionMercado[]>();

  readonly borradorPrecio = signal<number | null>(null);
  readonly borradorLugar = signal('');
  readonly borradorUrl = signal('');
  readonly borradorCondicion = signal<CondicionProducto>('desconocida');
  readonly borradorCaracteristicas = signal('');
  readonly error = signal<string | null>(null);

  readonly estadisticas = computed(() =>
    calcularEstadisticasMercado(
      this.observaciones().map((o) => o.precio),
      this.minimoObservaciones(),
    ),
  );

  etiquetaCondicion(c: CondicionProducto): string {
    return ETIQUETAS_CONDICION[c];
  }

  aNumero(event: Event): number | null {
    const v = (event.target as HTMLInputElement).value;
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  aTexto(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  aCondicion(event: Event): CondicionProducto {
    const v = (event.target as HTMLSelectElement).value as CondicionProducto;
    return v;
  }

  agregar(): void {
    const precio = this.borradorPrecio();
    if (precio == null || precio <= 0) {
      this.error.set('Ingresá un precio observado mayor a 0.');
      return;
    }
    const observacion: ObservacionMercado = {
      id: nuevoId('obs'),
      precio,
      vendedor: this.borradorLugar().trim() || null,
      url: this.borradorUrl().trim() || null,
      marca: null,
      modelo: null,
      caracteristicas: this.borradorCaracteristicas().trim() || null,
      condicion: this.borradorCondicion(),
      accesorios: null,
      garantia: null,
      envio: null,
      fechaConsulta: ahoraIso(),
    };
    this.cambio.emit([...this.observaciones(), observacion]);
    this.borradorPrecio.set(null);
    this.borradorLugar.set('');
    this.borradorUrl.set('');
    this.borradorCaracteristicas.set('');
    this.borradorCondicion.set('desconocida');
    this.error.set(null);
  }

  quitar(id: string): void {
    this.cambio.emit(this.observaciones().filter((o) => o.id !== id));
  }
}
