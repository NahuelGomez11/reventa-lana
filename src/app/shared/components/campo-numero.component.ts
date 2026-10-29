import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

function mensaje(errors: Record<string, unknown> | null): string | null {
  if (!errors) return null;
  if (errors['required']) return 'Este campo es obligatorio.';
  if (errors['numeroInvalido']) return 'Ingresá un número válido.';
  if (errors['negativo']) return 'No puede ser negativo.';
  if (errors['noPositivo']) return 'Debe ser mayor a 0.';
  if (errors['enteroPositivo']) return 'Debe ser un entero mayor a 0.';
  if (errors['porcentajeFueraDeRango']) return 'Debe estar entre 0 y 100.';
  return 'Valor inválido.';
}

/** Campo numérico con etiqueta, ayuda y mensaje de error. */
@Component({
  selector: 'app-campo-numero',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="block text-sm">
      <span class="text-slate-700">{{ etiqueta() }}</span>
      <input
        type="number"
        inputmode="decimal"
        class="mt-1 w-full input"
        [class.input-error]="mostrarError()"
        [formControl]="control()"
        [step]="paso()"
        [attr.min]="minimo()"
      />
      @if (mostrarError()) {
        <span class="mt-1 block text-xs text-red-600">{{ textoError() }}</span>
      } @else if (ayuda()) {
        <span class="mt-1 block text-xs text-slate-500">{{ ayuda() }}</span>
      }
    </label>
  `,
})
export class CampoNumeroComponent {
  readonly etiqueta = input('Valor');
  readonly control = input.required<FormControl<number | null>>();
  readonly ayuda = input<string | null>(null);
  readonly paso = input(1);
  readonly minimo = input<number | null>(null);
  readonly mostrarErrores = input(false);

  readonly mostrarError = computed(() => {
    const c = this.control();
    return c.invalid && (this.mostrarErrores() || c.touched);
  });

  readonly textoError = computed(() => mensaje(this.control().errors) ?? 'Valor inválido.');
}
