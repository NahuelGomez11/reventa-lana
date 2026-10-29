import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Moneda } from '../../core/models/analisis.model';
import { ImportePipe } from '../../shared/pipes/formato.pipe';

export interface SlicePastel {
  etiqueta: string;
  valor: number;
  color: string;
  id?: string;
}

@Component({
  selector: 'app-grafico-pastel',
  standalone: true,
  imports: [ImportePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (slices().length === 0 || total() <= 0) {
      <p class="text-sm text-slate-500">Sin datos para graficar.</p>
    } @else {
      <div class="flex flex-col items-center gap-4 sm:flex-row">
        <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" class="h-48 w-48 shrink-0" role="img" [attr.aria-label]="titulo()">
          @for (s of paths(); track s.etiqueta) {
            <path [attr.d]="s.d" [attr.fill]="s.color" stroke="#0b1220" stroke-width="1" />
          }
          <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="inner" fill="#0b1220" />
        </svg>
        <ul class="grid w-full gap-1 text-xs">
          @for (s of slices(); track s.etiqueta) {
            <li class="flex items-center justify-between gap-2">
              @if (s.id) {
                <a [routerLink]="['/productos', s.id]" class="flex min-w-0 flex-1 items-center gap-2 truncate hover:underline">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-sm" [style.background]="s.color"></span>
                  <span class="truncate text-slate-900">{{ s.etiqueta }}</span>
                </a>
              } @else {
                <span class="flex min-w-0 flex-1 items-center gap-2 truncate">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-sm" [style.background]="s.color"></span>
                  <span class="truncate text-slate-900">{{ s.etiqueta }}</span>
                </span>
              }
              <span class="shrink-0 font-medium text-slate-900">{{ s.valor | importe: moneda() }}</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class GraficoPastelComponent {
  readonly slices = input.required<SlicePastel[]>();
  readonly titulo = input<string>('');
  readonly moneda = input<Moneda>('ARS');
  readonly size = 160;
  readonly inner = 40;

  readonly total = computed(() => this.slices().reduce((a, s) => a + (s.valor > 0 ? s.valor : 0), 0));

  readonly paths = computed(() => {
    const slices = this.slices().filter((s) => s.valor > 0);
    const total = slices.reduce((a, s) => a + s.valor, 0);
    if (total <= 0) return [];
    const cx = this.size / 2;
    const cy = this.size / 2;
    const r = this.size / 2 - 2;
    let startAngle = -Math.PI / 2;
    return slices.map((s) => {
      const angle = (s.valor / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      startAngle = endAngle;
      return { etiqueta: s.etiqueta, d, color: s.color };
    });
  });
}
