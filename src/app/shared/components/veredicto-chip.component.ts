import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { infoVeredicto, Veredicto } from '../veredicto';

/** Distintivo corto del veredicto (Conviene / Revisar / No conviene / Faltan datos). */
@Component({
  selector: 'app-veredicto-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
      [class]="info().chip"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>
      {{ info().etiqueta }}
    </span>
  `,
})
export class VeredictoChipComponent {
  readonly veredicto = input.required<Veredicto>();
  readonly info = computed(() => infoVeredicto(this.veredicto()));
}
