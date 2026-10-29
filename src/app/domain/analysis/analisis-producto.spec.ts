import { UMBRALES_DEFECTO } from '../../core/models/configuracion.model';
import { crearProductoBorrador, ObservacionMercado, Producto } from '../../core/models/producto.model';
import { analizarProducto } from './analisis-producto';
import { CODIGOS_ALERTA } from '../risk/risk-rules';

function observacion(precio: number): ObservacionMercado {
  return {
    id: `o${precio}`,
    precio,
    vendedor: null,
    url: null,
    marca: null,
    modelo: null,
    caracteristicas: null,
    condicion: 'desconocida',
    accesorios: null,
    garantia: null,
    envio: null,
    fechaConsulta: '2026-01-01',
  };
}

function productoCompleto(): Producto {
  return {
    ...crearProductoBorrador('2026-01-01T00:00:00.000Z'),
    id: 'p1',
    nombre: 'Producto de prueba',
    actualizadoEn: '2026-01-02T00:00:00.000Z',
    datos: {
      cantidad: 10,
      capitalDisponible: 50000,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: {
        precioVentaObjetivo: 200,
        comisionPorcentaje: 10,
        comisionMonto: null,
        envioCliente: 0,
        publicidadPorUnidad: 0,
        publicidadPresupuesto: null,
        impuestosPorcentaje: 0,
        impuestosMonto: null,
        otrosCostosVenta: 0,
      },
    },
    observaciones: [observacion(200), observacion(202), observacion(198)],
  };
}

describe('analizarProducto', () => {
  it('analiza un producto completo con resultados y sin riesgo alto', () => {
    const a = analizarProducto(productoCompleto(), UMBRALES_DEFECTO);
    expect(a.resultado).not.toBeNull();
    expect(a.resultado?.margenNetoSobreVentas).toBeCloseTo(40, 5);
    expect(a.estadisticas.suficiente).toBe(true);
    expect(a.nivelRiesgo).not.toBe('alta');
    expect(a.requiereInvestigacion).toBe(false);
  });

  it('sin datos obligatorios no calcula y pide investigación', () => {
    const p = productoCompleto();
    p.datos.cantidad = null;
    const a = analizarProducto(p, UMBRALES_DEFECTO);
    expect(a.resultado).toBeNull();
    expect(a.construccion.ok).toBe(false);
    expect(a.requiereInvestigacion).toBe(true);
    expect(a.alertas.some((x) => x.codigo === CODIGOS_ALERTA.datosIncompletos)).toBe(true);
  });

  it('usa el capital global cuando el producto no define el suyo', () => {
    const p = productoCompleto();
    p.datos.capitalDisponible = null;
    const sinGlobal = analizarProducto(p, UMBRALES_DEFECTO, null);
    expect(sinGlobal.resultado?.porcentajeCapitalComprometido).toBeNull();

    const conGlobal = analizarProducto(p, UMBRALES_DEFECTO, 50000);
    expect(conGlobal.resultado?.porcentajeCapitalComprometido).toBeCloseTo(2, 5);
  });

  it('marca investigación con pocas observaciones de mercado', () => {
    const p = productoCompleto();
    p.observaciones = [observacion(200)];
    const a = analizarProducto(p, UMBRALES_DEFECTO);
    expect(a.estadisticas.suficiente).toBe(false);
    expect(a.requiereInvestigacion).toBe(true);
  });

  it('calcula la diferencia frente a la mediana del mercado', () => {
    const p = productoCompleto();
    p.datos.costosVenta.precioVentaObjetivo = 220;
    p.datos.costosVenta.comisionPorcentaje = 10;
    const a = analizarProducto(p, UMBRALES_DEFECTO);
    expect(a.diferenciaVsMedianaPct).toBeCloseTo(10, 5);
  });
});
