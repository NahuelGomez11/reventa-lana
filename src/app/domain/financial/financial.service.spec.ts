import { calcularFinanzas, precioVentaParaMargen } from './financial.service';

describe('calcularFinanzas', () => {
  it('calcula básico sin costos fijos', () => {
    const res = calcularFinanzas({
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 150, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.costoAdquisicionUnitarioEfectivo).toBeCloseTo(100, 5);
    expect(res.gananciaNetaPorUnidad).toBeCloseTo(50, 5);
    expect(res.gananciaPotencialTotal).toBeCloseTo(500, 5);
    expect(res.margenNetoSobreVentas).toBeCloseTo(100 * (50/150), 5);
    expect(res.roi).toBeCloseTo(50, 5);
  });

  it('distribuye envío proveedor entre unidades', () => {
    const res = calcularFinanzas({
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 50, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 160, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.costoAdquisicionUnitarioEfectivo).toBeCloseTo(105, 5);
  });

  it('PMR cubre costos fijos distribuidos', () => {
    const res = calcularFinanzas({
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 150, envioCliente: 0, otrosCostosVenta: 0 },
      costosFijos: 100,
    });
    expect(res.precioMinimoRentable).not.toBeNull();
    if (res.precioMinimoRentable != null) {
      expect(res.precioMinimoRentable).toBeCloseTo(110, 5);
    }
  });

  it('advierte margen insuficiente cuando cvu >= pvo', () => {
    const res = calcularFinanzas({
      cantidad: 5,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 100, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.advertencias.some(a => a.includes('Margen insuficiente'))).toBe(true);
  });

  it('cantidad 0: advierte, no calcula PMR/BEQ y no produce NaN', () => {
    const res = calcularFinanzas({
      cantidad: 0,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 50, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 200, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.advertencias).toContain('Cantidad debe ser mayor a 0.');
    expect(res.inversionTotal).toBe(0);
    expect(res.precioMinimoRentable).toBeNull();
    expect(res.puntoEquilibrioUnidades).toBeNull();
    expect(Number.isFinite(res.costoVariableUnitarioTotal)).toBe(true);
    expect(Number.isFinite(res.gananciaNetaPorUnidad)).toBe(true);
  });

  it('cantidad negativa: no reparte negativamente ni produce NaN', () => {
    const res = calcularFinanzas({
      cantidad: -5,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 50, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 200, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.advertencias).toContain('Cantidad debe ser mayor a 0.');
    expect(res.costoAdquisicionUnitarioEfectivo).toBeCloseTo(100, 5);
    expect(res.precioMinimoRentable).toBeNull();
  });

  it('precio de venta 0: advierte y no calcula margen ni ROI engañosos', () => {
    const res = calcularFinanzas({
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 0, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.advertencias).toContain('Precio de venta objetivo debe ser mayor a 0.');
    expect(res.advertencias.some((a) => a.includes('No se puede calcular margen'))).toBe(true);
    expect(res.margenNetoSobreVentas).toBe(0);
    expect(res.puntoEquilibrioUnidades).toBeNull();
  });

  it('margen exactamente cero: ganancia 0, margen 0 y BEQ indefinido', () => {
    const res = calcularFinanzas({
      cantidad: 5,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 100, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.gananciaNetaPorUnidad).toBeCloseTo(0, 5);
    expect(res.margenNetoSobreVentas).toBeCloseTo(0, 5);
    expect(res.puntoEquilibrioUnidades).toBeNull();
  });

  it('capital 0: no calcula % comprometido y lo informa como supuesto', () => {
    const res = calcularFinanzas({
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 150, envioCliente: 0, otrosCostosVenta: 0 },
      capitalDisponible: 0,
    });
    expect(res.porcentajeCapitalComprometido).toBeNull();
    expect(res.supuestos.some((s) => s.includes('Capital disponible'))).toBe(true);
  });

  it('valores grandes: mantiene precisión sin desbordes', () => {
    const res = calcularFinanzas({
      cantidad: 1000,
      costosCompra: { precioCompraUnitario: 1_000_000_000, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 1_500_000_000, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.inversionTotal).toBeCloseTo(1e12, 0);
    expect(res.gananciaPotencialTotal).toBeCloseTo(0.5e12, 0);
    expect(res.roi).toBeCloseTo(50, 5);
  });

  it('valores muy pequeños: mantiene centavos sin colapsar a cero', () => {
    const res = calcularFinanzas({
      cantidad: 100,
      costosCompra: { precioCompraUnitario: 0.01, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 0.02, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.gananciaNetaPorUnidad).toBeCloseTo(0.01, 6);
    expect(res.margenNetoSobreVentas).toBeCloseTo(50, 5);
    expect(res.roi).toBeCloseTo(100, 5);
  });

  it('costos fijos: BEQ cubre fijos y PMR los distribuye (no confundir con recupero de desembolso)', () => {
    const res = calcularFinanzas({
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 150, envioCliente: 0, otrosCostosVenta: 0 },
      costosFijos: 200,
    });
    // BEQ = CF / (PVO - CVU) = 200 / 50 = 4 unidades
    expect(res.puntoEquilibrioUnidades).toBeCloseTo(4, 5);
    // PMR = CVU + CF/Q = 100 + 20 = 120
    expect(res.precioMinimoRentable).toBeCloseTo(120, 5);
    // inversión = CAUE*Q + CF = 1000 + 200
    expect(res.inversionTotal).toBeCloseTo(1200, 5);
  });
});

describe('precioVentaParaMargen', () => {
  it('calcula el precio para lograr un margen neto (sin costos variables de venta)', () => {
    // Margen 40% sobre ventas y costo 100 => precio = 100 / (1 - 0.4) = 166.67
    const precio = precioVentaParaMargen(
      {
        cantidad: 10,
        costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
        costosVenta: { precioVentaObjetivo: 0, envioCliente: 0, otrosCostosVenta: 0 },
      },
      40,
    );
    expect(precio).toBeCloseTo(166.67, 2);

    const res = calcularFinanzas({
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: precio as number, envioCliente: 0, otrosCostosVenta: 0 },
    });
    expect(res.margenNetoSobreVentas).toBeCloseTo(40, 1);
  });

  it('tiene en cuenta comisión e impuestos porcentuales sobre el precio', () => {
    // A = 100, t = (10+5)/100 = 0.15, margen 30% => 100 / (1 - 0.15 - 0.30) = 181.82
    const precio = precioVentaParaMargen(
      {
        cantidad: 10,
        costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
        costosVenta: {
          precioVentaObjetivo: 0,
          envioCliente: 0,
          otrosCostosVenta: 0,
          comisionPorcentaje: 10,
          impuestosPorcentaje: 5,
        },
      },
      30,
    );
    expect(precio).toBeCloseTo(181.82, 2);

    const res = calcularFinanzas({
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: {
        precioVentaObjetivo: precio as number,
        envioCliente: 0,
        otrosCostosVenta: 0,
        comisionPorcentaje: 10,
        impuestosPorcentaje: 5,
      },
    });
    expect(res.margenNetoSobreVentas).toBeCloseTo(30, 1);
  });

  it('devuelve null cuando no hay solución (margen imposible o sin costos)', () => {
    const base = {
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 0, envioCliente: 0, otrosCostosVenta: 0 },
    };
    expect(precioVentaParaMargen(base, 100)).toBeNull();
    expect(
      precioVentaParaMargen(
        {
          ...base,
          costosCompra: { precioCompraUnitario: 0, envioProveedor: 0, otrosCostosAdquisicion: 0 },
        },
        30,
      ),
    ).toBeNull();
    expect(precioVentaParaMargen(base, Number.NaN)).toBeNull();
  });
});
