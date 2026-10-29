import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Moneda } from '../../core/models/analisis.model';
import { EscalaPrecios, posicionEnEscala, TonoMarcador } from '../escala-precios';
import { ImportePipe } from '../pipes/formato.pipe';

const COLOR: Record<TonoMarcador, string> = {
  propio: 'bg-violet-400 shadow-[0_0_12px_2px_rgba(167,139,250,0.7)]',
  mercado: 'bg-cyan-300 shadow-[0_0_10px_1px_rgba(103,232,249,0.6)]',
  costo: 'bg-slate-400',
  equilibrio: 'bg-amber-400 shadow-[0_0_10px_1px_rgba(251,191,36,0.5)]',
};

const BORDE: Record<TonoMarcador, string> = {
  propio: 'ring-violet-300',
  mercado: 'ring-cyan-200',
  costo: 'ring-slate-300',
  equilibrio: 'ring-amber-300',
};

/**
 * Escala horizontal que compara tu precio con el mercado. Sin etiquetas flotantes:
 * la barra muestra los puntos y debajo una leyenda ordenada con color, nombre y valor.
 */
@Component({
  selector: 'app-escala-precios',
  standalone: true,
  imports: [ImportePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (escala(); as e) {
      <div class="relative" [class]="compacta() ? 'h-2' : 'h-2.5'">
        <!-- Pista -->
        <div class="absolute inset-0 rounded-full bg-slate-200"></div>

        <!-- Rango de precios vistos en el mercado -->
        @if (e.banda; as b) {
          <div
            class="absolute inset-y-0 rounded-full bg-gradient-to-r from-cyan-400/15 via-cyan-400/45 to-cyan-400/15 ring-1 ring-cyan-400/40"
            [style.left.%]="posicion(b.min, e)"
            [style.width.%]="posicion(b.max, e) - posicion(b.min, e)"
          ></div>
        }

        @for (m of e.marcadores; track m.id) {
          <span
            class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[#0b1222]"
            [class]="(compacta() ? 'h-3 w-3 ' : 'h-4 w-4 ') + color(m.tono)"
            [style.left.%]="posicion(m.valor, e)"
            [attr.title]="m.etiqueta + ': ' + (m.valor | importe: moneda())"
          ></span>
        }
      </div>

      @if (!compacta()) {
        <!-- Ejes: mínimo y máximo de la escala -->
        <div class="mt-1.5 flex justify-between text-[10px] tabular-nums text-slate-500">
          <span>{{ e.desde | importe: moneda() }}</span>
          <span>{{ e.hasta | importe: moneda() }}</span>
        </div>

        <!-- Leyenda -->
        <ul class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          @for (m of e.marcadores; track m.id) {
            <li class="flex items-center gap-3 rounded-2xl bg-slate-100 px-3 py-2.5 ring-1 ring-slate-200">
              <span class="h-3 w-3 shrink-0 rounded-full ring-2 ring-[#0b1222]" [class]="color(m.tono)"></span>
              <span class="min-w-0 flex-1">
                <span class="block text-xs text-slate-500">{{ m.etiqueta }}</span>
                <span class="block font-semibold tabular-nums text-slate-900">{{ m.valor | importe: moneda() }}</span>
              </span>
            </li>
          }
        </ul>

        @if (e.banda; as b) {
          <p class="mt-2 text-xs text-slate-500">
            Rango visto en otros lugares: de {{ b.min | importe: moneda() }} a {{ b.max | importe: moneda() }}.
          </p>
        }
      }
    }
  `,
})
export class EscalaPreciosComponent {
  readonly escala = input<EscalaPrecios | null>(null);
  readonly moneda = input<Moneda>('ARS');
  readonly compacta = input(false);

  posicion(valor: number, e: EscalaPrecios): number {
    return posicionEnEscala(valor, e.desde, e.hasta);
  }

  color(tono: TonoMarcador): string {
    return COLOR[tono];
  }

  borde(tono: TonoMarcador): string {
    return BORDE[tono];
  }
}
