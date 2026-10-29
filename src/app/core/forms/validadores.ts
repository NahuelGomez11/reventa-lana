import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validadores para formularios de datos financieros.
 * Regla central: vacío (null/'') NO es 0; lo controla el validador `requerido`.
 * Estos validadores solo rechazan valores presentes pero inválidos.
 */

export function numeroValido(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v == null || v === '') return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return { numeroInvalido: true };
  return null;
}

export function noNegativo(control: AbstractControl): ValidationErrors | null {
  const base = numeroValido(control);
  if (base) return base;
  const v = control.value;
  if (v == null || v === '') return null;
  if (v < 0) return { negativo: true };
  return null;
}

export function positivoSiPresente(control: AbstractControl): ValidationErrors | null {
  const base = numeroValido(control);
  if (base) return base;
  const v = control.value;
  if (v == null || v === '') return null;
  if (v <= 0) return { noPositivo: true };
  return null;
}

export function enteroPositivo(control: AbstractControl): ValidationErrors | null {
  const base = numeroValido(control);
  if (base) return base;
  const v = control.value;
  if (v == null || v === '') return null;
  if (!Number.isInteger(v) || v <= 0) return { enteroPositivo: true };
  return null;
}

export function porcentajeValido(control: AbstractControl): ValidationErrors | null {
  const base = numeroValido(control);
  if (base) return base;
  const v = control.value;
  if (v == null || v === '') return null;
  if (v < 0 || v > 100) return { porcentajeFueraDeRango: true };
  return null;
}

/** Limpia un input numérico de Angular ('' -> null), sin inventar ceros. */
export function aNumeroONull(valor: unknown): number | null {
  if (valor == null || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}
