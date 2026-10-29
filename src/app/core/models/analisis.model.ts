// Tipos y modelos para el dominio
export type Moneda = 'ARS' | 'USD';

export interface CostosCompra {
  precioCompraUnitario: number; // ARS
  envioProveedor: number; // ARS total para la compra
  otrosCostosAdquisicion: number; // ARS total
}

export interface CostosVenta {
  precioVentaObjetivo: number; // ARS
  comisionPorcentaje?: number; // %
  comisionMonto?: number; // ARS
  envioCliente: number; // ARS
  publicidadPorUnidad?: number; // ARS
  publicidadPresupuesto?: number; // ARS total
  impuestosPorcentaje?: number; // %
  impuestosMonto?: number; // ARS
  otrosCostosVenta: number; // ARS
}

export interface AnalisisInput {
  cantidad: number;
  costosCompra: CostosCompra;
  costosVenta: CostosVenta;
  capitalDisponible?: number;
  costosFijos?: number; // ARS
}

/**
 * Datos crudos ingresados por el usuario.
 * `null` significa "sin completar" y NUNCA debe tratarse como 0.
 * El dominio decide qué campos son obligatorios para calcular.
 */
export interface DatosCompra {
  precioCompraUnitario: number | null;
  envioProveedor: number | null;
  otrosCostosAdquisicion: number | null;
}

export interface DatosVenta {
  precioVentaObjetivo: number | null;
  comisionPorcentaje: number | null;
  comisionMonto: number | null;
  envioCliente: number | null;
  publicidadPorUnidad: number | null;
  publicidadPresupuesto: number | null;
  impuestosPorcentaje: number | null;
  impuestosMonto: number | null;
  otrosCostosVenta: number | null;
}

export interface DatosAnalisis {
  cantidad: number | null;
  capitalDisponible: number | null;
  costosCompra: DatosCompra;
  costosVenta: DatosVenta;
}
