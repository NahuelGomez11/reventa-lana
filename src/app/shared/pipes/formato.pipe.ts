import { Pipe, PipeTransform } from '@angular/core';
import { Moneda } from '../../core/models/analisis.model';

/** Formatea importes monetarios. `null` = sin dato (nunca un cero inventado). */
@Pipe({ name: 'importe', standalone: true })
export class ImportePipe implements PipeTransform {
  transform(valor: number | null | undefined, moneda: Moneda = 'ARS'): string {
    if (valor == null || !Number.isFinite(valor)) return '—';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(valor);
  }
}

/** Formatea porcentajes. `null` = no calculable. */
@Pipe({ name: 'porcentaje', standalone: true })
export class PorcentajePipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 1): string {
    if (valor == null || !Number.isFinite(valor)) return '—';
    return `${valor.toLocaleString('es-AR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })} %`;
  }
}

/** Formatea cantidades (unidades, observaciones). `null` = sin dato. */
@Pipe({ name: 'numero', standalone: true })
export class NumeroPipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 0): string {
    if (valor == null || !Number.isFinite(valor)) return '—';
    return valor.toLocaleString('es-AR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  }
}

/** Formatea fechas ISO. `null` o inválida = sin dato. */
@Pipe({ name: 'fecha', standalone: true })
export class FechaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor) return '—';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
