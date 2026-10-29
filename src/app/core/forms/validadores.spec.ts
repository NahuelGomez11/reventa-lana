import { FormControl } from '@angular/forms';
import {
  aNumeroONull,
  enteroPositivo,
  noNegativo,
  numeroValido,
  porcentajeValido,
  positivoSiPresente,
} from './validadores';

describe('validadores numéricos', () => {
  it('numeroValido acepta vacío y números finitos, rechaza texto/NaN', () => {
    expect(numeroValido(new FormControl(null))).toBeNull();
    expect(numeroValido(new FormControl(''))).toBeNull();
    expect(numeroValido(new FormControl(0))).toBeNull();
    expect(numeroValido(new FormControl(12.5))).toBeNull();
    expect(numeroValido(new FormControl('abc'))).toMatchObject({ numeroInvalido: true });
    expect(numeroValido(new FormControl(Number.NaN))).toMatchObject({ numeroInvalido: true });
    expect(numeroValido(new FormControl(Number.POSITIVE_INFINITY))).toMatchObject({
      numeroInvalido: true,
    });
  });

  it('noNegativo acepta 0 y rechaza negativos', () => {
    expect(noNegativo(new FormControl(0))).toBeNull();
    expect(noNegativo(new FormControl(null))).toBeNull();
    expect(noNegativo(new FormControl(-1))).toMatchObject({ negativo: true });
  });

  it('positivoSiPresente exige > 0 solo si hay valor', () => {
    expect(positivoSiPresente(new FormControl(null))).toBeNull();
    expect(positivoSiPresente(new FormControl(1))).toBeNull();
    expect(positivoSiPresente(new FormControl(0))).toMatchObject({ noPositivo: true });
    expect(positivoSiPresente(new FormControl(-3))).toMatchObject({ noPositivo: true });
  });

  it('enteroPositivo exige enteros > 0', () => {
    expect(enteroPositivo(new FormControl(null))).toBeNull();
    expect(enteroPositivo(new FormControl(3))).toBeNull();
    expect(enteroPositivo(new FormControl(2.5))).toMatchObject({ enteroPositivo: true });
    expect(enteroPositivo(new FormControl(0))).toMatchObject({ enteroPositivo: true });
  });

  it('porcentajeValido exige rango 0..100', () => {
    expect(porcentajeValido(new FormControl(0))).toBeNull();
    expect(porcentajeValido(new FormControl(100))).toBeNull();
    expect(porcentajeValido(new FormControl(101))).toMatchObject({
      porcentajeFueraDeRango: true,
    });
    expect(porcentajeValido(new FormControl(-1))).toMatchObject({
      porcentajeFueraDeRango: true,
    });
  });
});

describe('aNumeroONull', () => {
  it('convierte vacío a null y no inventa ceros', () => {
    expect(aNumeroONull('')).toBeNull();
    expect(aNumeroONull(null)).toBeNull();
    expect(aNumeroONull(undefined)).toBeNull();
    expect(aNumeroONull('abc')).toBeNull();
    expect(aNumeroONull('0')).toBe(0);
    expect(aNumeroONull(12.5)).toBe(12.5);
    expect(aNumeroONull('12.5')).toBe(12.5);
  });
});
