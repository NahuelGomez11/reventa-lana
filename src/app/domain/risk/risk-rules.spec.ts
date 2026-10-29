import { UMBRALES_DEFECTO, UmbralesRiesgo } from '../../core/models/configuracion.model';
import { calcularFinanzas, ResultadoFinanciero } from '../financial/financial.service';
import { calcularEstadisticasMercado } from '../market/market-stats';
import { compararProveedores } from '../providers/comparacion-proveedores';
import { evaluarRiesgo, severidadMaxima, CODIGOS_ALERTA, InputRiesgo } from './risk-rules';

const umbrales: UmbralesRiesgo = { ...UMBRALES_DEFECTO };

function resultadoOk(): ResultadoFinanciero {
  return calcularFinanzas({
    cantidad: 10,
    costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
    costosVenta: { precioVentaObjetivo: 200, envioCliente: 0, otrosCostosVenta: 0 },
    capitalDisponible: 100000,
  });
}

function resultadoCon(precioVentaObjetivo: number, extras: { capital?: number; fijos?: number; cantidad?: number } = {}): ResultadoFinanciero {
  return calcularFinanzas({
    cantidad: extras.cantidad ?? 10,
    costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
    costosVenta: { precioVentaObjetivo, envioCliente: 0, otrosCostosVenta: 0 },
    capitalDisponible: extras.capital ?? 100000,
    costosFijos: extras.fijos,
  });
}

function base(overrides: Partial<InputRiesgo>): InputRiesgo {
  return {
    precioVentaObjetivo: 200,
    precioMinimoAceptable: null,
    resultado: resultadoOk(),
    faltantes: [],
    estadisticas: calcularEstadisticasMercado([200, 202, 198], umbrales.minObservacionesMercado),
    comparacion: null,
    umbrales,
    ...overrides,
  };
}

describe('evaluarRiesgo', () => {
  it('no emite alertas de riesgo cuando todo cumple umbrales (solo oportunidad)', () => {
    const alertas = evaluarRiesgo(base({}));
    expect(alertas.some((a) => a.severidad === 'alta')).toBe(false);
    expect(alertas.some((a) => a.codigo === CODIGOS_ALERTA.oportunidadParaInvestigar)).toBe(true);
  });

  it('reporta datos incompletos con la lista concreta', () => {
    const alertas = evaluarRiesgo(base({ resultado: null, faltantes: ['Cantidad a comprar'] }));
    const a = alertas.find((x) => x.codigo === CODIGOS_ALERTA.datosIncompletos);
    expect(a?.severidad).toBe('alta');
    expect(a?.detalle).toContain('Cantidad a comprar');
  });

  it('reporta margen insuficiente por debajo del umbral', () => {
    const alertas = evaluarRiesgo(
      base({ precioVentaObjetivo: 110, resultado: resultadoCon(110) }),
    );
    const a = alertas.find((x) => x.codigo === CODIGOS_ALERTA.margenInsuficiente);
    expect(a).toBeDefined();
    expect(['alta', 'media']).toContain(a?.severidad);
  });

  it('reporta capital comprometido por encima del umbral', () => {
    const res = resultadoCon(200, { cantidad: 100, capital: 12000 });
    const alertas = evaluarRiesgo(base({ resultado: res }));
    const a = alertas.find((x) => x.codigo === CODIGOS_ALERTA.capitalComprometido);
    expect(a?.severidad).toBe('media');
    expect(a?.detalle).toContain('%');
  });

  it('reporta precio fuera de mercado por encima de la mediana', () => {
    const alertas = evaluarRiesgo(base({ precioVentaObjetivo: 260, resultado: resultadoCon(260) }));
    const a = alertas.find((x) => x.codigo === CODIGOS_ALERTA.precioFueraDeMercado);
    expect(a?.severidad).toBe('media');
    expect(a?.detalle).toContain('por encima');
  });

  it('reporta información de mercado insuficiente', () => {
    const alertas = evaluarRiesgo(
      base({ estadisticas: calcularEstadisticasMercado([200], umbrales.minObservacionesMercado) }),
    );
    const a = alertas.find((x) => x.codigo === CODIGOS_ALERTA.mercadoInsuficiente);
    expect(a?.severidad).toBe('media');
  });

  it('no sugiere oportunidad solo por margen alto sin mercado suficiente', () => {
    const alertas = evaluarRiesgo(
      base({ estadisticas: calcularEstadisticasMercado([200], umbrales.minObservacionesMercado) }),
    );
    expect(alertas.some((a) => a.codigo === CODIGOS_ALERTA.oportunidadParaInvestigar)).toBe(false);
  });

  it('no sugiere oportunidad sin capital informado', () => {
    const res = calcularFinanzas({
      cantidad: 10,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 200, envioCliente: 0, otrosCostosVenta: 0 },
    });
    const alertas = evaluarRiesgo(base({ resultado: res }));
    expect(alertas.some((a) => a.codigo === CODIGOS_ALERTA.capitalSinInformar)).toBe(true);
    expect(alertas.some((a) => a.codigo === CODIGOS_ALERTA.oportunidadParaInvestigar)).toBe(false);
  });

  it('informa alternativa de proveedor más económica', () => {
    const comparacion = compararProveedores(
      [
        {
          id: 'p1',
          nombre: 'Barato',
          url: null,
          precioUnitario: 80,
          stockDisponible: 50,
          envio: 0,
          compraMinima: 1,
          garantia: null,
          observaciones: null,
          fechaActualizacion: '2026-01-01T00:00:00.000Z',
        },
      ],
      10,
      0,
    );
    const alertas = evaluarRiesgo(base({ comparacion }));
    const a = alertas.find((x) => x.codigo === CODIGOS_ALERTA.proveedorAlternativaMasBarata);
    expect(a?.severidad).toBe('baja');
    expect(a?.detalle).toContain('Barato');
  });

  it('reporta punto de equilibrio por encima de la cantidad planificada', () => {
    const res = calcularFinanzas({
      cantidad: 5,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: { precioVentaObjetivo: 200, envioCliente: 0, otrosCostosVenta: 0 },
      costosFijos: 1000,
    });
    const alertas = evaluarRiesgo(base({ resultado: res }));
    const a = alertas.find((x) => x.codigo === CODIGOS_ALERTA.puntoEquilibrioNoAlcanzado);
    expect(a?.severidad).toBe('alta');
    expect(a?.detalle).toContain('unidades');
  });

  it('reporta precio objetivo por debajo del mínimo aceptable', () => {
    const alertas = evaluarRiesgo(base({ precioMinimoAceptable: 180, precioVentaObjetivo: 150 }));
    const a = alertas.find((x) => x.codigo === CODIGOS_ALERTA.precioBajoMinimoAceptable);
    expect(a?.severidad).toBe('alta');
  });

  it('severidadMaxima ordena alta > media > baja', () => {
    expect(severidadMaxima([{ codigo: 'x', severidad: 'baja', titulo: '', detalle: '' }])).toBe('baja');
    expect(
      severidadMaxima([
        { codigo: 'x', severidad: 'baja', titulo: '', detalle: '' },
        { codigo: 'y', severidad: 'media', titulo: '', detalle: '' },
        { codigo: 'z', severidad: 'alta', titulo: '', detalle: '' },
      ]),
    ).toBe('alta');
    expect(severidadMaxima([])).toBeNull();
  });
});
