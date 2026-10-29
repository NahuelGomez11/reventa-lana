import { UMBRALES_DEFECTO } from '../../core/models/configuracion.model';
import { crearProductoBorrador, Producto } from '../../core/models/producto.model';
import { analizarProducto } from './analisis-producto';
import { ItemDashboard, resumirDashboard } from './resumen-dashboard';

function producto(id: string, nombre: string, precioVenta: number, actualizadoEn: string): Producto {
  return {
    ...crearProductoBorrador('2026-01-01T00:00:00.000Z'),
    id,
    nombre,
    actualizadoEn,
    datos: {
      cantidad: 10,
      capitalDisponible: 100000,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: {
        precioVentaObjetivo: precioVenta,
        comisionPorcentaje: null,
        comisionMonto: 0,
        envioCliente: 0,
        publicidadPorUnidad: 0,
        publicidadPresupuesto: null,
        impuestosPorcentaje: null,
        impuestosMonto: 0,
        otrosCostosVenta: 0,
      },
    },
  };
}

function item(p: Producto): ItemDashboard {
  return {
    id: p.id,
    nombre: p.nombre,
    actualizadoEn: p.actualizadoEn,
    analisis: analizarProducto(p, UMBRALES_DEFECTO),
  };
}

describe('resumirDashboard', () => {
  it('sin productos devuelve ceros y valores nulos', () => {
    const r = resumirDashboard([]);
    expect(r.totalProductos).toBe(0);
    expect(r.mayorInversionIndividual).toBeNull();
    expect(r.mayorGananciaIndividual).toBeNull();
    expect(r.actividadReciente).toEqual([]);
  });

  it('cuenta análisis, riesgo e investigación', () => {
    const items = [
      item(producto('a', 'Rentable', 300, '2026-01-05T00:00:00.000Z')),
      item(producto('b', 'Sin margen', 50, '2026-01-06T00:00:00.000Z')),
    ];
    const r = resumirDashboard(items);
    expect(r.totalProductos).toBe(2);
    expect(r.conCalculo).toBe(2);
    expect(r.conAlertasRiesgo).toBeGreaterThanOrEqual(1);
    expect(r.mayorInversionIndividual?.valor).toBe(1000);
  });

  it('no suma inversiones alternativas: expone la mayor individual', () => {
    const items = [
      item(producto('a', 'A', 300, '2026-01-05T00:00:00.000Z')),
      item(producto('b', 'B', 300, '2026-01-06T00:00:00.000Z')),
    ];
    const r = resumirDashboard(items);
    expect(r.mayorInversionIndividual?.valor).toBe(1000);
    expect((r as unknown as Record<string, unknown>)['sumaInversiones']).toBeUndefined();
  });

  it('ordena la actividad reciente de más reciente a más antigua y limita a 5', () => {
    const items: ItemDashboard[] = [];
    for (let i = 0; i < 7; i++) {
      items.push(item(producto(`p${i}`, `P${i}`, 300, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`)));
    }
    const r = resumirDashboard(items);
    expect(r.actividadReciente).toHaveLength(5);
    expect(r.actividadReciente[0].id).toBe('p6');
    expect(r.actividadReciente[4].id).toBe('p2');
  });
});
