import { AnalisisInput } from '../../core/models/analisis.model';

export interface ResultadoFinanciero {
  cantidad: number;
  costoAdquisicionUnitarioEfectivo: number;
  costoVariableUnitarioTotal: number;
  inversionTotal: number;
  facturacionPotencial: number;
  costosTotales: number;
  gananciaNetaPorUnidad: number;
  gananciaPotencialTotal: number;
  margenNetoSobreVentas: number; // %
  roi: number; // %
  puntoEquilibrioUnidades: number | null;
  precioMinimoRentable: number | null;
  porcentajeCapitalComprometido: number | null;
  advertencias: string[];
  supuestos: string[];
}

const EPS = 1e-9;
const toCents = (v: number) => Math.round(v * 100);
const fromCents = (c: number) => c / 100;

function isPositive(v: number) {
  return v > EPS;
}

function isNonNegative(v: number) {
  return v >= -EPS;
}

export function calcularFinanzas(input: AnalisisInput): ResultadoFinanciero {
  const advertencias: string[] = [];
  const supuestos: string[] = [];

  if (input.cantidad <= 0) {
    advertencias.push('Cantidad debe ser mayor a 0.');
  }
  if ((input.capitalDisponible ?? 0) <= 0) {
    supuestos.push('Capital disponible no ingresado o <= 0; % comprometido no calculado.');
  }

  const Q = input.cantidad;
  const adqTotal = input.costosCompra.envioProveedor + input.costosCompra.otrosCostosAdquisicion;
  const adqUnit = Q > 0 ? adqTotal / Q : 0;
  supuestos.push('Costos de adquisición fijos distribuidos entre unidades.');
  const caue = input.costosCompra.precioCompraUnitario + adqUnit;

  let comisionUnit = 0;
  if (input.costosVenta.comisionMonto != null && input.costosVenta.comisionMonto >= 0) {
    comisionUnit = input.costosVenta.comisionMonto;
  } else if (input.costosVenta.comisionPorcentaje != null && input.costosVenta.comisionPorcentaje >= 0) {
    comisionUnit = (input.costosVenta.precioVentaObjetivo * input.costosVenta.comisionPorcentaje) / 100;
    supuestos.push('Comisión calculada como % sobre precio de venta.');
  }

  let publicidadUnit = input.costosVenta.publicidadPorUnidad ?? 0;
  if (publicidadUnit <= 0 && (input.costosVenta.publicidadPresupuesto ?? 0) > 0 && Q > 0) {
    publicidadUnit = (input.costosVenta.publicidadPresupuesto ?? 0) / Q;
    supuestos.push('Presupuesto publicidad distribuido entre unidades.');
  }

  let impuestosUnit = 0;
  if (input.costosVenta.impuestosMonto != null && input.costosVenta.impuestosMonto >= 0) {
    impuestosUnit = input.costosVenta.impuestosMonto;
  } else if (input.costosVenta.impuestosPorcentaje != null && input.costosVenta.impuestosPorcentaje >= 0) {
    impuestosUnit = (input.costosVenta.precioVentaObjetivo * input.costosVenta.impuestosPorcentaje) / 100;
    supuestos.push('Impuestos calculados como % sobre precio de venta (según modelo).');
  }

  const otrosVentaUnit = input.costosVenta.otrosCostosVenta ?? 0;
  const cvu = caue + comisionUnit + input.costosVenta.envioCliente + publicidadUnit + impuestosUnit + otrosVentaUnit;
  const cf = input.costosFijos ?? 0;

  if (cvu < 0) {
    advertencias.push('Costo variable unitario negativo (revisar costos).');
  }
  if (input.costosVenta.precioVentaObjetivo <= 0) {
    advertencias.push('Precio de venta objetivo debe ser mayor a 0.');
  }
  if (cvu >= input.costosVenta.precioVentaObjetivo - EPS && input.costosVenta.precioVentaObjetivo > 0) {
    advertencias.push('Margen insuficiente con supuestos actuales.');
  }

  const inversionTotal = Q > 0 ? caue * Q + cf : cf;
  const facturacionPotencial = Q > 0 ? input.costosVenta.precioVentaObjetivo * Q : 0;
  const costosTotales = cvu * Q + cf;
  const gananciaNetaPorUnidad = input.costosVenta.precioVentaObjetivo - cvu;
  const gananciaPotencialTotal = facturacionPotencial - costosTotales;

  let margenNetoSobreVentas = 0;
  if (isPositive(input.costosVenta.precioVentaObjetivo)) {
    margenNetoSobreVentas = (gananciaNetaPorUnidad / input.costosVenta.precioVentaObjetivo) * 100;
  } else {
    advertencias.push('No se puede calcular margen sin precio de venta.');
  }

  let roi = 0;
  if (isPositive(inversionTotal)) {
    roi = (gananciaPotencialTotal / inversionTotal) * 100;
  } else {
    advertencias.push('Inversión total <= 0; no se calcula ROI.');
  }

  let puntoEquilibrioUnidades: number | null = null;
  if (Q > 0 && isPositive(input.costosVenta.precioVentaObjetivo - cvu) && cf >= 0) {
    puntoEquilibrioUnidades = cf / (input.costosVenta.precioVentaObjetivo - cvu);
  } else {
    puntoEquilibrioUnidades = null;
    supuestos.push('Punto de equilibrio no calculado (margen negativo o sin costos fijos relevantes).');
  }

  let precioMinimoRentable: number | null = null;
  if (Q > 0) {
    precioMinimoRentable = cvu + (cf / Q);
    supuestos.push('PMR calculado cubriendo costos variables + distribución de costos fijos entre Q.');
  } else {
    precioMinimoRentable = null;
  }

  let porcentajeCapitalComprometido: number | null = null;
  if ((input.capitalDisponible ?? 0) > 0 && inversionTotal >= 0) {
    porcentajeCapitalComprometido = (inversionTotal / (input.capitalDisponible ?? 1)) * 100;
  }

  return {
    cantidad: Q,
    costoAdquisicionUnitarioEfectivo: caue,
    costoVariableUnitarioTotal: cvu,
    inversionTotal,
    facturacionPotencial,
    costosTotales,
    gananciaNetaPorUnidad,
    gananciaPotencialTotal,
    margenNetoSobreVentas,
    roi,
    puntoEquilibrioUnidades,
    precioMinimoRentable,
    porcentajeCapitalComprometido,
    advertencias,
    supuestos,
  };
}

/**
 * Precio de venta necesario para alcanzar un margen neto sobre ventas objetivo.
 *
 * Reutiliza el mismo modelo de costos que `calcularFinanzas`. Si `A` son los
 * costos variables fijos por unidad (CAUE + envío al cliente + publicidad +
 * otros costos de venta + comisiones/impuestos por monto) y `t` la tasa de
 * costos proporcionales al precio (comisión % + impuestos %), entonces:
 *
 *   margen = 1 - t - A / precio   =>   precio = A / (1 - t - margen)
 *
 * Devuelve `null` cuando no hay solución posible (sin costos, margen >= 100% o
 * costos proporcionales que no dejan margen). No inventa valores: solo resuelve
 * la ecuación con los datos ingresados.
 */
export function precioVentaParaMargen(input: AnalisisInput, margenPct: number): number | null {
  if (!Number.isFinite(margenPct)) return null;
  const m = margenPct / 100;
  if (m >= 1) return null;

  const Q = input.cantidad;
  if (!(Q > 0)) return null;

  const d = input.costosCompra;
  const caue = d.precioCompraUnitario + (d.envioProveedor + d.otrosCostosAdquisicion) / Q;

  let publicidadUnit = input.costosVenta.publicidadPorUnidad ?? 0;
  if (publicidadUnit <= 0 && (input.costosVenta.publicidadPresupuesto ?? 0) > 0) {
    publicidadUnit = (input.costosVenta.publicidadPresupuesto ?? 0) / Q;
  }

  const comisionMonto = input.costosVenta.comisionMonto ?? 0;
  const impuestosMonto = input.costosVenta.impuestosMonto ?? 0;

  const fijoUnitario =
    caue +
    input.costosVenta.envioCliente +
    publicidadUnit +
    input.costosVenta.otrosCostosVenta +
    comisionMonto +
    impuestosMonto;

  const tasaProporcional =
    ((input.costosVenta.comisionPorcentaje ?? 0) + (input.costosVenta.impuestosPorcentaje ?? 0)) /
    100;

  const denominador = 1 - tasaProporcional - m;
  if (denominador <= EPS) return null;
  if (fijoUnitario <= 0) return null;

  const precio = fijoUnitario / denominador;
  if (!Number.isFinite(precio) || precio <= 0) return null;
  return Math.round(precio * 100) / 100;
}
