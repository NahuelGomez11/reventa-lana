import { DatosAnalisis } from '../../core/models/analisis.model';
import { preciosSugeridos, simularPrecios } from './simulacion';

function datos(): DatosAnalisis {
  return {
    cantidad: 10,
    capitalDisponible: 100000,
    costosCompra: {
      precioCompraUnitario: 100,
      envioProveedor: 0,
      otrosCostosAdquisicion: 0,
    },
    costosVenta: {
      precioVentaObjetivo: 200,
      comisionPorcentaje: null,
      comisionMonto: 10,
      envioCliente: 10,
      publicidadPorUnidad: 0,
      publicidadPresupuesto: null,
      impuestosPorcentaje: null,
      impuestosMonto: 0,
      otrosCostosVenta: 0,
    },
  };
}

describe('simularPrecios', () => {
  it('calcula cada fila con el motor sin modificar los datos originales', () => {
    const d = datos();
    const original = JSON.parse(JSON.stringify(d));
    const filas = simularPrecios(d, [150, 200, 250], 200);

    expect(filas).toHaveLength(3);
    expect(JSON.parse(JSON.stringify(d))).toEqual(original);

    // CVU = 100 (compra) + 10 (comisión monto) + 10 (envío) = 120
    expect(filas[0].resultado?.costoVariableUnitarioTotal).toBeCloseTo(120, 5);
    expect(filas[0].resultado?.gananciaNetaPorUnidad).toBeCloseTo(30, 5);
    expect(filas[2].resultado?.gananciaNetaPorUnidad).toBeCloseTo(130, 5);
    expect(filas[0].diferenciaVsMedianaPct).toBeCloseTo(-25, 5);
    expect(filas[1].diferenciaVsMedianaPct).toBeCloseTo(0, 5);
  });

  it('marca inválidos los precios no positivos', () => {
    const filas = simularPrecios(datos(), [0, -10, Number.NaN], null);
    expect(filas.every((f) => !f.valido && f.resultado === null)).toBe(true);
    expect(filas[0].motivo).toContain('mayor a 0');
  });

  it('no calcula si faltan datos del análisis y lo informa', () => {
    const d = datos();
    d.costosVenta.precioVentaObjetivo = null;
    const filas = simularPrecios(d, [200], null);
    expect(filas[0].valido).toBe(false);
    expect(filas[0].faltantes).toContain('Precio de venta objetivo');
    expect(filas[0].motivo).toContain('Faltan datos');
  });
});

describe('preciosSugeridos', () => {
  it('propone objetivo y valores alrededor de la mediana, sin duplicados', () => {
    const sugeridos = preciosSugeridos(200, 200);
    expect(sugeridos).toContain(200);
    expect(new Set(sugeridos).size).toBe(sugeridos.length);
    expect(sugeridos.length).toBeLessThanOrEqual(4);
  });

  it('no propone nada sin datos', () => {
    expect(preciosSugeridos(null, null)).toEqual([]);
    expect(preciosSugeridos(0, null)).toEqual([]);
  });

  it('con mediana sola propone valores alrededor de ella', () => {
    const sugeridos = preciosSugeridos(null, 1000);
    expect(sugeridos).toContain(1000);
    expect(sugeridos).toContain(900);
    expect(sugeridos).toContain(1100);
  });
});
