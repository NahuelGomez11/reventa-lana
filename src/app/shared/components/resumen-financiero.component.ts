import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Moneda } from '../../core/models/analisis.model';
import { ResultadoFinanciero } from '../../domain/financial/financial.service';
import { ImportePipe, NumeroPipe, PorcentajePipe } from '../pipes/formato.pipe';

/**
 * Muestra el resultado del motor financiero sin recalcular nada.
 * Primero los 4 números que importan; el resto queda plegado.
 */
@Component({
  selector: 'app-resumen-financiero',
  standalone: true,
  imports: [ImportePipe, NumeroPipe, PorcentajePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2 class="text-base font-semibold text-slate-900">Resultados calculados</h2>

      @if (!resultado()) {
        <div class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p class="text-sm font-semibold text-amber-900">Todavía no se puede calcular</p>
          <p class="mt-1 text-sm text-amber-800">Faltan datos obligatorios. No mostramos cifras estimadas.</p>
          @if (faltantes().length > 0) {
            <ul class="mt-2 list-inside list-disc text-sm text-amber-900">
              @for (f of faltantes(); track f) {
                <li>{{ f }}</li>
              }
            </ul>
          }
        </div>
      } @else {
        <div class="mt-3 grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-slate-50 p-4">
            <p class="text-xs text-slate-500">Lo que pagás en total</p>
            <p class="mt-1 text-lg font-bold text-slate-900">{{ resultado()!.inversionTotal | importe: moneda() }}</p>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <p class="text-xs text-slate-500">Ganancia por unidad</p>
            <p
              class="mt-1 text-lg font-bold"
              [class.text-rose-700]="resultado()!.gananciaNetaPorUnidad < 0"
              [class.text-emerald-700]="resultado()!.gananciaNetaPorUnidad > 0"
            >
              {{ resultado()!.gananciaNetaPorUnidad | importe: moneda() }}
            </p>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <p class="text-xs text-slate-500">Ganancia total</p>
            <p
              class="mt-1 text-lg font-bold"
              [class.text-rose-700]="resultado()!.gananciaPotencialTotal < 0"
              [class.text-emerald-700]="resultado()!.gananciaPotencialTotal > 0"
            >
              {{ resultado()!.gananciaPotencialTotal | importe: moneda() }}
            </p>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <p class="text-xs text-slate-500">Ganancia sobre lo vendido</p>
            <p class="mt-1 text-lg font-bold text-slate-900">{{ resultado()!.margenNetoSobreVentas | porcentaje }}</p>
          </div>
        </div>

        <details class="group mt-3 rounded-2xl border border-slate-200 p-4">
          <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-700">
            Ver todos los números
            <span class="text-slate-400 transition group-open:rotate-180" aria-hidden="true">▾</span>
          </summary>
          <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt class="text-xs text-slate-500">Costo por unidad</dt>
              <dd class="font-medium">{{ resultado()!.costoAdquisicionUnitarioEfectivo | importe: moneda() }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Ventas posibles</dt>
              <dd class="font-medium">{{ resultado()!.facturacionPotencial | importe: moneda() }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Costos totales</dt>
              <dd class="font-medium">{{ resultado()!.costosTotales | importe: moneda() }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Retorno sobre lo invertido (ROI)</dt>
              <dd class="font-medium">{{ resultado()!.roi | porcentaje }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Unidades para no perder</dt>
              <dd class="font-medium">
                {{ resultado()!.puntoEquilibrioUnidades | numero: 0 }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Precio mínimo para no perder</dt>
              <dd class="font-medium">{{ resultado()!.precioMinimoRentable | importe: moneda() }}</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-xs text-slate-500">Parte de tu capital que usás</dt>
              <dd class="font-medium">
                {{ resultado()!.porcentajeCapitalComprometido | porcentaje }}
                @if (resultado()!.porcentajeCapitalComprometido == null) {
                  <span class="text-xs font-normal text-slate-500">(cargá tu capital para verlo)</span>
                }
              </dd>
            </div>
          </dl>
        </details>

        @if (resultado(); as r) {
          @if (r.supuestos.length > 0) {
            <div class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p class="text-xs font-semibold text-amber-900">Supuestos usados</p>
              <ul class="mt-1 list-inside list-disc text-sm text-amber-800">
                @for (s of r.supuestos; track s) {
                  <li>{{ s }}</li>
                }
              </ul>
            </div>
          }
          @if (r.advertencias.length > 0) {
            <div class="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p class="text-xs font-semibold text-rose-900">Avisos del cálculo</p>
              <ul class="mt-1 list-inside list-disc text-sm text-rose-800">
                @for (a of r.advertencias; track a) {
                  <li>{{ a }}</li>
                }
              </ul>
            </div>
          }
        }
      }
    </section>
  `,
})
export class ResumenFinancieroComponent {
  readonly resultado = input.required<ResultadoFinanciero | null>();
  readonly faltantes = input<string[]>([]);
  readonly moneda = input<Moneda>('ARS');
}
