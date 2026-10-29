import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatosAnalisis, Moneda } from '../../core/models/analisis.model';
import { preciosSugeridos, simularPrecios } from '../../domain/financial/simulacion';
import { ImportePipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';

/**
 * Simulador de precios: recalcula con el MISMO motor financiero del análisis,
 * solo cambiando el precio de venta. No modifica el producto hasta que se guarde.
 */
@Component({
  selector: 'app-simulador-precios',
  standalone: true,
  imports: [ImportePipe, PorcentajePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-slate-900">Simulador de precios</h2>
        <span class="text-xs text-slate-500">
          Recalcula margen, ROI y ganancia con el mismo motor del análisis.
        </span>
      </div>

      @if (filas().length === 0) {
        <p class="mt-2 text-sm text-slate-600">
          Sin precios para simular. Agregá uno o usá las sugerencias.
        </p>
      } @else {
        <div class="mt-3 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-2 py-1 text-right font-medium">Precio venta</th>
                <th class="px-2 py-1 text-right font-medium">Ganancia/unid.</th>
                <th class="px-2 py-1 text-right font-medium">Ganancia total</th>
                <th class="px-2 py-1 text-right font-medium">Margen</th>
                <th class="px-2 py-1 text-right font-medium">ROI</th>
                <th class="px-2 py-1 text-right font-medium">Vs mediana</th>
                <th class="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              @for (fila of filas(); track fila.precioVenta) {
                <tr class="border-t">
                  <td class="px-2 py-1 text-right">{{ fila.precioVenta | importe: moneda() }}</td>
                  @if (fila.resultado; as r) {
                    <td class="px-2 py-1 text-right">{{ r.gananciaNetaPorUnidad | importe: moneda() }}</td>
                    <td class="px-2 py-1 text-right">{{ r.gananciaPotencialTotal | importe: moneda() }}</td>
                    <td class="px-2 py-1 text-right">{{ r.margenNetoSobreVentas | porcentaje }}</td>
                    <td class="px-2 py-1 text-right">{{ r.roi | porcentaje }}</td>
                  } @else {
                    <td class="px-2 py-1 text-right text-amber-700" colspan="4">
                      {{ fila.motivo }}
                      @if (fila.faltantes.length > 0) {
                        <span class="text-xs">(faltan datos del análisis)</span>
                      }
                    </td>
                  }
                  <td class="px-2 py-1 text-right">
                    {{ fila.diferenciaVsMedianaPct | porcentaje }}
                  </td>
                  <td class="px-2 py-1 text-right">
                    <button class="text-xs text-red-700 hover:underline" (click)="quitar(fila.precioVenta)">
                      Quitar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <div class="mt-4 flex flex-wrap items-end gap-2 border-t pt-3">
        <label class="block text-sm">
          <span class="text-slate-700">Agregar precio ({{ moneda() }})</span>
          <input
            type="number"
            class="mt-1 w-40 input"
            [value]="borrador()"
            (input)="borrador.set(aNumero($event))"
          />
        </label>
        <button
          type="button"
          class="btn-primary"
          (click)="agregar()"
        >
          Agregar
        </button>
        <button
          type="button"
          class="btn-secondary"
          (click)="usarSugeridos()"
        >
          Usar precios sugeridos
        </button>
      </div>
      @if (sugerencias().length > 0) {
        <p class="mt-2 text-xs text-slate-500">
          Sugerencias derivadas del precio objetivo y la mediana:
          @for (s of sugerencias(); track s) {
            <span class="mr-2">{{ s | importe: moneda() }}</span>
          }
        </p>
      }
      @if (error()) {
        <p class="mt-2 text-xs text-red-600">{{ error() }}</p>
      }
    </section>
  `,
})
export class SimuladorPreciosComponent {
  readonly datos = input.required<DatosAnalisis>();
  readonly mediana = input<number | null>(null);
  readonly moneda = input<Moneda>('ARS');
  readonly precios = input.required<number[]>();
  readonly cambio = output<number[]>();

  readonly borrador = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  readonly filas = computed(() =>
    simularPrecios(this.datos(), this.precios(), this.mediana()),
  );

  readonly sugerencias = computed(() =>
    preciosSugeridos(this.datos().costosVenta.precioVentaObjetivo, this.mediana()),
  );

  aNumero(event: Event): number | null {
    const v = (event.target as HTMLInputElement).value;
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  agregar(): void {
    const precio = this.borrador();
    if (precio == null || precio <= 0) {
      this.error.set('Ingresá un precio de venta mayor a 0.');
      return;
    }
    if (this.precios().some((p) => p === precio)) {
      this.error.set('Ese precio ya está en la simulación.');
      return;
    }
    this.cambio.emit([...this.precios(), precio]);
    this.borrador.set(null);
    this.error.set(null);
  }

  quitar(precio: number): void {
    this.cambio.emit(this.precios().filter((p) => p !== precio));
  }

  usarSugeridos(): void {
    const combinados = [...this.precios()];
    for (const s of this.sugerencias()) {
      if (!combinados.some((p) => p === s)) combinados.push(s);
    }
    this.cambio.emit(combinados);
    this.error.set(null);
  }
}
