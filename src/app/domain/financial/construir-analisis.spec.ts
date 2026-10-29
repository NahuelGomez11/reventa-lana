import { DatosAnalisis } from '../../core/models/analisis.model';
import { construirAnalisisInput } from './construir-analisis';

function datosCompletos(): DatosAnalisis {
  return {
    cantidad: 10,
    capitalDisponible: 50000,
    costosCompra: {
      precioCompraUnitario: 100,
      envioProveedor: 50,
      otrosCostosAdquisicion: 50,
    },
    costosVenta: {
      precioVentaObjetivo: 200,
      comisionPorcentaje: 10,
      comisionMonto: null,
      envioCliente: 30,
      publicidadPorUnidad: 5,
      publicidadPresupuesto: null,
      impuestosPorcentaje: null,
      impuestosMonto: 10,
      otrosCostosVenta: 5,
    },
  };
}

describe('construirAnalisisInput', () => {
  it('construye el input cuando todos los datos obligatorios existen', () => {
    const res = construirAnalisisInput(datosCompletos());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.input.cantidad).toBe(10);
      expect(res.input.costosVenta.comisionPorcentaje).toBe(10);
      expect(res.input.costosVenta.impuestosMonto).toBe(10);
      expect(res.input.costosVenta.publicidadPorUnidad).toBe(5);
      expect(res.input.capitalDisponible).toBe(50000);
      expect(res.faltantes).toEqual([]);
    }
  });

  it('informa faltantes en lugar de reemplazar por cero', () => {
    const d = datosCompletos();
    d.costosCompra.precioCompraUnitario = null;
    d.costosVenta.envioCliente = null;
    const res = construirAnalisisInput(d);
    expect(res.ok).toBe(false);
    expect(res.input).toBeNull();
    expect(res.faltantes).toContain('Precio de compra unitario');
    expect(res.faltantes).toContain('Envío al cliente');
  });

  it('reporta faltantes de comisión e impuestos cuando no hay modo cargado', () => {
    const d = datosCompletos();
    d.costosVenta.comisionPorcentaje = null;
    d.costosVenta.comisionMonto = null;
    d.costosVenta.impuestosPorcentaje = null;
    d.costosVenta.impuestosMonto = null;
    const res = construirAnalisisInput(d);
    expect(res.ok).toBe(false);
    expect(res.faltantes.join(' ')).toContain('Comisión');
    expect(res.faltantes.join(' ')).toContain('Impuestos');
  });

  it('prefiere monto fijo sobre porcentaje cuando ambos existen (modo monto)', () => {
    const d = datosCompletos();
    d.costosVenta.comisionPorcentaje = 10;
    d.costosVenta.comisionMonto = 25;
    const res = construirAnalisisInput(d);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.input.costosVenta.comisionMonto).toBe(25);
      expect(res.input.costosVenta.comisionPorcentaje).toBeUndefined();
    }
  });

  it('usa presupuesto de publicidad cuando no hay publicidad por unidad', () => {
    const d = datosCompletos();
    d.costosVenta.publicidadPorUnidad = null;
    d.costosVenta.publicidadPresupuesto = 100;
    const res = construirAnalisisInput(d);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.input.costosVenta.publicidadPresupuesto).toBe(100);
      expect(res.input.costosVenta.publicidadPorUnidad).toBeUndefined();
    }
  });

  it('capital disponible es opcional: no bloquea el cálculo', () => {
    const d = datosCompletos();
    d.capitalDisponible = null;
    const res = construirAnalisisInput(d);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.input.capitalDisponible).toBeUndefined();
    }
  });

  it('con precioVentaOpcional el precio de venta puede faltar sin bloquear', () => {
    const d = datosCompletos();
    d.costosVenta.precioVentaObjetivo = null;
    const obligatorio = construirAnalisisInput(d);
    expect(obligatorio.ok).toBe(false);
    expect(obligatorio.faltantes).toContain('Precio de venta objetivo');

    const opcional = construirAnalisisInput(d, { precioVentaOpcional: true });
    expect(opcional.ok).toBe(true);
    if (opcional.ok) {
      expect(opcional.input.costosVenta.precioVentaObjetivo).toBe(0);
      expect(opcional.faltantes).not.toContain('Precio de venta objetivo');
    }
  });
});
