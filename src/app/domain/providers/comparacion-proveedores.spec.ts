import { compararProveedores, costoEfectivoProveedor } from './comparacion-proveedores';
import { Proveedor } from '../../core/models/producto.model';

function proveedor(base: Partial<Proveedor> & { id: string; nombre: string }): Proveedor {
  return {
    url: null,
    precioUnitario: 1000,
    stockDisponible: null,
    envio: 0,
    compraMinima: 1,
    garantia: null,
    observaciones: null,
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    ...base,
  };
}

describe('costoEfectivoProveedor', () => {
  it('reparte envío y otros costos entre las unidades', () => {
    const p = proveedor({ id: 'a', nombre: 'A', precioUnitario: 1000, envio: 200 });
    expect(costoEfectivoProveedor(p, 10, 100)).toBeCloseTo(1000 + 300 / 10, 6);
  });

  it('evita división por cero con cantidad no positiva', () => {
    const p = proveedor({ id: 'a', nombre: 'A', precioUnitario: 1000, envio: 200 });
    expect(costoEfectivoProveedor(p, 0, 100)).toBe(1000);
  });
});

describe('compararProveedores', () => {
  it('identifica el de menor costo efectivo entre comparables', () => {
    const lista = [
      proveedor({ id: 'a', nombre: 'A', precioUnitario: 1000, envio: 500 }),
      proveedor({ id: 'b', nombre: 'B', precioUnitario: 1010, envio: 100 }),
    ];
    const res = compararProveedores(lista, 10, 0);
    expect(res.mejorId).toBe('b');
    expect(res.evaluaciones.every((e) => e.comparable)).toBe(true);
  });

  it('descarta proveedor cuya compra mínima no se cumple', () => {
    const lista = [
      proveedor({ id: 'a', nombre: 'A', precioUnitario: 1000, compraMinima: 5 }),
      proveedor({ id: 'b', nombre: 'B', precioUnitario: 1200, compraMinima: 1 }),
    ];
    const res = compararProveedores(lista, 3, 0);
    const a = res.evaluaciones.find((e) => e.id === 'a');
    expect(a?.comparable).toBe(false);
    expect(a?.motivos.join(' ')).toContain('al menos 5');
    expect(res.mejorId).toBe('b');
  });

  it('descarta proveedor con stock insuficiente', () => {
    const lista = [
      proveedor({ id: 'a', nombre: 'A', stockDisponible: 2 }),
      proveedor({ id: 'b', nombre: 'B', stockDisponible: 50 }),
    ];
    const res = compararProveedores(lista, 10, 0);
    expect(res.evaluaciones.find((e) => e.id === 'a')?.comparable).toBe(false);
    expect(res.evaluaciones.find((e) => e.id === 'a')?.motivos.join(' ')).toContain('Stock insuficiente');
    expect(res.mejorId).toBe('b');
  });

  it('informa cuando las cantidades mínimas difieren', () => {
    const lista = [
      proveedor({ id: 'a', nombre: 'A', compraMinima: 1 }),
      proveedor({ id: 'b', nombre: 'B', compraMinima: 20 }),
    ];
    const res = compararProveedores(lista, 25, 0);
    expect(res.advertencias.some((x) => x.includes('cantidades mínimas difieren'))).toBe(true);
  });

  it('sin cantidad no marca ningún proveedor como comparable', () => {
    const lista = [proveedor({ id: 'a', nombre: 'A' })];
    const res = compararProveedores(lista, null, 0);
    expect(res.evaluaciones[0].comparable).toBe(false);
    expect(res.mejorId).toBeNull();
    expect(res.advertencias.some((x) => x.includes('Cantidad de compra'))).toBe(true);
  });

  it('avisa si otros costos de adquisición no fueron ingresados', () => {
    const lista = [proveedor({ id: 'a', nombre: 'A' })];
    const res = compararProveedores(lista, 5, null);
    expect(res.advertencias.some((x) => x.includes('Otros costos de adquisición'))).toBe(true);
    expect(res.evaluaciones[0].costoEfectivoUnitario).toBeCloseTo(1000, 6);
  });
});
