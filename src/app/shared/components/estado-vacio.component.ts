import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Estado vacío reutilizable: explica qué hacer, con un solo botón claro. */
@Component({
  selector: 'app-estado-vacio',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <p class="mt-3 text-base font-semibold text-slate-900">{{ titulo() }}</p>
      @if (mensaje()) {
        <p class="mx-auto mt-1 max-w-sm text-sm text-slate-600">{{ mensaje() }}</p>
      }
      @if (accionTexto() && accionRuta()) {
        <a [routerLink]="accionRuta()!" class="btn-primary mt-4 w-full sm:w-auto">
          {{ accionTexto() }}
        </a>
      }
    </div>
  `,
})
export class EstadoVacioComponent {
  readonly titulo = input('Sin datos');
  readonly mensaje = input<string | null>(null);
  readonly accionTexto = input<string | null>(null);
  readonly accionRuta = input<string | null>(null);
}
