import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Alerta } from '../../domain/risk/risk-rules';

function etiqueta(severidad: Alerta['severidad']): string {
  switch (severidad) {
    case 'alta':
      return 'Importante';
    case 'media':
      return 'Atención';
    default:
      return 'Info';
  }
}

function clases(severidad: Alerta['severidad']): string {
  switch (severidad) {
    case 'alta':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'media':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-800';
  }
}

/** Alertas de riesgo con su motivo concreto. Las reglas son determinísticas. */
@Component({
  selector: 'app-lista-alertas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (alertas().length === 0) {
      <p class="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
        No hay alertas con los datos actuales.
      </p>
    } @else {
      <ul class="grid gap-2">
        @for (alerta of alertas(); track alerta.codigo + alerta.detalle) {
          <li class="rounded-2xl border p-4" [class]="clases(alerta.severidad)">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-semibold">{{ alerta.titulo }}</span>
              <span class="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">
                {{ etiqueta(alerta.severidad) }}
              </span>
            </div>
            <p class="mt-1 text-sm opacity-90">{{ alerta.detalle }}</p>
          </li>
        }
      </ul>
    }
  `,
})
export class ListaAlertasComponent {
  readonly alertas = input<Alerta[]>([]);
  readonly clases = clases;
  readonly etiqueta = etiqueta;
}
