import { AnalisisInput, DatosAnalisis } from '../../core/models/analisis.model';

export type ConstruccionAnalisis =
  | { ok: true; input: AnalisisInput; faltantes: string[] }
  | { ok: false; input: null; faltantes: string[] };

function esNumero(v: number | null): v is number {
  return v != null && Number.isFinite(v);
}

/**
 * Convierte los datos crudos ingresados por el usuario en un input para el motor financiero.
 * - `null` = dato sin completar: NUNCA se reemplaza silenciosamente por 0.
 * - Si falta un dato obligatorio, devuelve ok=false con la lista de faltantes.
 * - El modo elegido determina qué costo se considera (monto vs porcentaje);
 *   el campo inactivo se ignora (el formulario lo deja en null).
 * - Capital disponible es opcional: si falta, el motor informa que no calcula % comprometido.
 * - Con `precioVentaOpcional`, el precio de venta puede faltar (se usa 0 provisionalmente) para
 *   calcular un precio sugerido a partir de los costos sin exigir todavía el precio.
 */
export function construirAnalisisInput(
  datos: DatosAnalisis,
  opciones: { precioVentaOpcional?: boolean } = {},
): ConstruccionAnalisis {
  const faltantes: string[] = [];

  const d = datos.costosCompra;
  const v = datos.costosVenta;

  const cantidad = datos.cantidad;
  const precioCompraUnitario = d.precioCompraUnitario;
  const envioProveedor = d.envioProveedor;
  const otrosCostosAdquisicion = d.otrosCostosAdquisicion;
  const precioVentaObjetivo = v.precioVentaObjetivo;
  const envioCliente = v.envioCliente;
  const otrosCostosVenta = v.otrosCostosVenta;

  if (!esNumero(cantidad)) faltantes.push('Cantidad a comprar');
  if (!esNumero(precioCompraUnitario)) faltantes.push('Precio de compra unitario');
  if (!esNumero(envioProveedor)) faltantes.push('Envío del proveedor');
  if (!esNumero(otrosCostosAdquisicion)) faltantes.push('Otros costos de adquisición');
  if (!esNumero(precioVentaObjetivo) && !opciones.precioVentaOpcional) {
    faltantes.push('Precio de venta objetivo');
  }
  if (!esNumero(envioCliente)) faltantes.push('Envío al cliente');
  if (!esNumero(otrosCostosVenta)) faltantes.push('Otros costos por venta');

  const usarMontoComision = esNumero(v.comisionMonto);
  const usarMontoImpuestos = esNumero(v.impuestosMonto);

  if (!usarMontoComision && !esNumero(v.comisionPorcentaje)) {
    faltantes.push('Comisión de venta (monto o %)');
  }

  if (!usarMontoImpuestos && !esNumero(v.impuestosPorcentaje)) {
    faltantes.push('Impuestos (monto o %)');
  }

  const publicidadPorUnidad = v.publicidadPorUnidad;
  const publicidadPresupuesto = v.publicidadPresupuesto;
  const publicidadOk = esNumero(publicidadPorUnidad) || esNumero(publicidadPresupuesto);
  if (!publicidadOk) {
    faltantes.push('Publicidad (por unidad o presupuesto)');
  }

  if (faltantes.length > 0) {
    return { ok: false, input: null, faltantes };
  }

  const costosVenta: AnalisisInput['costosVenta'] = {
    precioVentaObjetivo: esNumero(precioVentaObjetivo) ? precioVentaObjetivo : 0,
    envioCliente: envioCliente as number,
    otrosCostosVenta: otrosCostosVenta as number,
  };
  if (usarMontoComision) {
    costosVenta.comisionMonto = v.comisionMonto as number;
  } else {
    costosVenta.comisionPorcentaje = v.comisionPorcentaje as number;
  }
  if (usarMontoImpuestos) {
    costosVenta.impuestosMonto = v.impuestosMonto as number;
  } else {
    costosVenta.impuestosPorcentaje = v.impuestosPorcentaje as number;
  }
  if (esNumero(publicidadPorUnidad)) {
    costosVenta.publicidadPorUnidad = publicidadPorUnidad;
  } else {
    costosVenta.publicidadPresupuesto = publicidadPresupuesto as number;
  }

  const input: AnalisisInput = {
    cantidad: cantidad as number,
    costosCompra: {
      precioCompraUnitario: precioCompraUnitario as number,
      envioProveedor: envioProveedor as number,
      otrosCostosAdquisicion: otrosCostosAdquisicion as number,
    },
    costosVenta,
  };
  if (esNumero(datos.capitalDisponible)) {
    input.capitalDisponible = datos.capitalDisponible;
  }

  return { ok: true, input, faltantes: [] };
}
