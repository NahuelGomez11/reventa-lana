import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/** Campo de texto (o área de texto) con etiqueta, ayuda y error. */
@Component({
  selector: 'app-campo-texto',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="block text-sm" [class.col-span-2]="anchoCompleto()">
      <span class="text-slate-700">{{ etiqueta() }}</span>
      @if (multilinea()) {
        <textarea
          rows="2"
          class="mt-1 w-full input"
          [class.input-error]="mostrarError()"
          [placeholder]="marcador() ?? ''"
          [formControl]="control()"
        ></textarea>
      } @else {
        <input
          type="text"
          class="mt-1 w-full input"
          [class.input-error]="mostrarError()"
          [placeholder]="marcador() ?? ''"
          [formControl]="control()"
        />
      }
      @if (mostrarError()) {
        <span class="mt-1 block text-xs text-red-600">Este campo es obligatorio.</span>
      } @else if (ayuda()) {
        <span class="mt-1 block text-xs text-slate-500">{{ ayuda() }}</span>
      }
    </label>
  `,
})
export class CampoTextoComponent {
  readonly etiqueta = input('Texto');
  readonly control = input.required<FormControl<string | null>>();
  readonly ayuda = input<string | null>(null);
  readonly marcador = input<string | null>(null);
  readonly multilinea = input(false);
  readonly anchoCompleto = input(false);
  readonly mostrarErrores = input(false);

  readonly mostrarError = computed(() => {
    const c = this.control();
    return c.invalid && (this.mostrarErrores() || c.touched);
  });
}
