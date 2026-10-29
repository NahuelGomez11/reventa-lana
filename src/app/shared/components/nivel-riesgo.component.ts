import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Severidad } from '../../domain/risk/risk-rules';

export function etiquetaSeveridad(severidad: Severidad | null): string {
  switch (severidad) {
    case 'alta':
      return 'Riesgo alto';
    case 'media':
      return 'Riesgo medio';
    case 'baja':
      return 'Riesgo bajo';
    default:
      return 'Sin alertas';
  }
}

export function clasesSeveridad(severidad: Severidad | null): string {
  switch (severidad) {
    case 'alta':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'media':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'baja':
      return 'bg-brand-100 text-brand-700 border-brand-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/** Distintivo del nivel de riesgo según la severidad máxima de las alertas. */
@Component({
  selector: 'app-nivel-riesgo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
      [class]="clases()"
    >
      {{ etiqueta() }}
    </span>
  `,
})
export class NivelRiesgoComponent {
  readonly severidad = input<Severidad | null>(null);
  readonly etiqueta = computed(() => etiquetaSeveridad(this.severidad()));
  readonly clases = computed(() => clasesSeveridad(this.severidad()));
}
