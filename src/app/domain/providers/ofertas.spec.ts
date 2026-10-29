import { Producto, Proveedor, crearProductoBorrador } from '../../core/models/producto.model';
import { analizarProducto } from '../analysis/analisis-producto';
import { UmbralesRiesgo } from '../../core/models/configuracion.model';
import {
  buscarOfertaDuplicada,
  descripcionFuenteCompra,
  registrarNuevoPrecio,
  resolverFuenteCompra,
  terminosDeOferta,
  validarTerminosOferta,
} from './ofertas';

const ANTES = '2026-01-01T00:00:00.000Z';
const DESPUES = '2026-02-01T00:00:00.000Z';

function oferta(base: Partial<Proveedor> & { id: string; nombre: string }): Proveedor {
  return {
    proveedorId: null,
    url: null,
    precioUnitario: 1000,
    stockDisponible: null,
    envio: 0,
    compraMinima: 1,
    garantia: null,
    observaciones: null,
    fechaActualizacion: ANTES,
    ...base,
  };
}

const UMBRALES: UmbralesRiesgo = {
  margenMinimoPct: 15,
  capitalComprometidoMaxPct: 50,
  desviacionPrecioMercadoPct: 10,
  minObservacionesMercado: 3,
} as UmbralesRiesgo;

describe('registrarNuevoPrecio', () => {
  it('archiva el precio vigente en el historial y deja el nuevo como vigente', () => {
    const o = oferta({ id: 'a', nombre: 'A', precioUnitario: 1000, envio: 50 });
    const nueva = registrarNuevoPrecio(
      o,
      { ...terminosDeOferta(o), precioUnitario: 900 },
      DESPUES,
    );
    expect(nueva.precioUnitario).toBe(900);
    expect(nueva.envio).toBe(50);
    expect(nueva.fechaActualizacion).toBe(DESPUES);
    expect(nueva.historial).toHaveLength(1);
    expect(nueva.historial?.[0]).toMatchObject({
      precioUnitario: 1000,
      envio: 50,
      vigenteDesde: ANTES,
      vigenteHasta: DESPUES,
    });
  });

  it('acumula varios precios en orden cronológico', () => {
    let o = oferta({ id: 'a', nombre: 'A', precioUnitario: 1000 });
    o = registrarNuevoPrecio(o, { ...terminosDeOferta(o), precioUnitario: 950 }, '2026-02-01T00:00:00.000Z');
    o = registrarNuevoPrecio(o, { ...terminosDeOferta(o), precioUnitario: 900 }, '2026-03-01T00:00:00.000Z');
    expect(o.precioUnitario).toBe(900);
    expect(o.historial?.map((r) => r.precioUnitario)).toEqual([1000, 950]);
  });

  it('no crea historial si los términos no cambiaron (tolerancia decimal)', () => {
    const o = oferta({ id: 'a', nombre: 'A', precioUnitario: 1000.001 });
    const igual = registrarNuevoPrecio(o, { ...terminosDeOferta(o), precioUnitario: 1000 }, DESPUES);
    expect(igual).toBe(o);
  });
});

describe('validarTerminosOferta', () => {
  const base = { precioUnitario: 100, envio: 0, compraMinima: 1, stockDisponible: 5, observaciones: null };

  it('acepta términos válidos', () => {
    expect(validarTerminosOferta(base)).toEqual([]);
  });

  it('rechaza precios negativos, compra mínima 0 y stock fraccionario', () => {
    const errores = validarTerminosOferta({
      ...base,
      precioUnitario: -1,
      compraMinima: 0,
      stockDisponible: 1.5,
    });
    expect(errores).toHaveLength(3);
  });

  it('acepta stock vacío (sin dato) sin inventar 0', () => {
    expect(validarTerminosOferta({ ...base, stockDisponible: null })).toEqual([]);
  });
});

describe('buscarOfertaDuplicada', () => {
  const lista = [oferta({ id: 'a', nombre: 'Proveedor Uno', proveedorId: 'cat-1' })];

  it('detecta el mismo proveedor de catálogo aunque cambie el nombre', () => {
    expect(buscarOfertaDuplicada(lista, { proveedorId: 'cat-1', nombre: 'Otro nombre' })?.id).toBe('a');
  });

  it('detecta por nombre sin distinguir mayúsculas ni espacios', () => {
    expect(buscarOfertaDuplicada(lista, { proveedorId: null, nombre: '  proveedor uno ' })?.id).toBe('a');
  });

  it('no marca duplicado a un proveedor distinto', () => {
    expect(buscarOfertaDuplicada(lista, { proveedorId: 'cat-2', nombre: 'Proveedor Dos' })).toBeNull();
  });
});

describe('resolverFuenteCompra', () => {
  const datos = {
    cantidad: 10,
    capitalDisponible: null,
    costosCompra: { precioCompraUnitario: 5000, envioProveedor: 300, otrosCostosAdquisicion: 100 },
    costosVenta: {
      precioVentaObjetivo: null,
      comisionPorcentaje: null,
      comisionMonto: null,
      envioCliente: null,
      publicidadPorUnidad: null,
      publicidadPresupuesto: null,
      impuestosPorcentaje: null,
      impuestosMonto: null,
      otrosCostosVenta: null,
    },
  };
  const ofertas = [oferta({ id: 'a', nombre: 'A', precioUnitario: 800, envio: 40, compraMinima: 4 })];

  it('sin oferta elegida usa los costos manuales', () => {
    const r = resolverFuenteCompra(datos, ofertas, null);
    expect(r.fuente).toEqual({ tipo: 'manual' });
    expect(r.datos.costosCompra.precioCompraUnitario).toBe(5000);
  });

  it('con oferta elegida reemplaza precio y envío, y conserva otros costos', () => {
    const r = resolverFuenteCompra(datos, ofertas, 'a');
    expect(r.datos.costosCompra).toEqual({
      precioCompraUnitario: 800,
      envioProveedor: 40,
      otrosCostosAdquisicion: 100,
    });
    expect(r.advertencias).toEqual([]);
  });

  it('avisa si la oferta exige más unidades que las planeadas', () => {
    const r = resolverFuenteCompra({ ...datos, cantidad: 2 }, ofertas, 'a', 2);
    expect(r.advertencias).toHaveLength(1);
  });

  it('si la oferta ya no existe usa los manuales y lo informa', () => {
    const r = resolverFuenteCompra(datos, ofertas, 'borrada');
    expect(r.fuente.tipo).toBe('oferta_no_encontrada');
    expect(r.datos.costosCompra.precioCompraUnitario).toBe(5000);
    expect(r.advertencias).toHaveLength(1);
    expect(descripcionFuenteCompra(r.fuente)).toContain('no encontrada');
  });
});

describe('analizarProducto con oferta de compra', () => {
  function producto(extra: Partial<Producto>): Producto {
    const base = crearProductoBorrador(ANTES);
    return {
      ...base,
      nombre: 'Prueba',
      datos: {
        cantidad: 10,
        capitalDisponible: 100000,
        costosCompra: { precioCompraUnitario: 5000, envioProveedor: 0, otrosCostosAdquisicion: 0 },
        costosVenta: {
          precioVentaObjetivo: 8000,
          comisionPorcentaje: 0,
          comisionMonto: null,
          envioCliente: 0,
          publicidadPorUnidad: 0,
          publicidadPresupuesto: null,
          impuestosPorcentaje: 0,
          impuestosMonto: null,
          otrosCostosVenta: 0,
        },
      },
      ...extra,
    };
  }

  it('usa el precio de la oferta elegida para el resultado financiero', () => {
    const manual = analizarProducto(producto({}), UMBRALES, null);
    const conOferta = analizarProducto(
      producto({
        proveedores: [oferta({ id: 'a', nombre: 'A', precioUnitario: 4000, envio: 0 })],
        ofertaCompraId: 'a',
      }),
      UMBRALES,
      null,
    );
    expect(manual.resultado).not.toBeNull();
    expect(conOferta.resultado).not.toBeNull();
    expect(conOferta.resultado!.inversionTotal).toBeLessThan(manual.resultado!.inversionTotal);
    expect(conOferta.fuenteCompra.tipo).toBe('oferta');
  });

  it('con oferta elegida, el precio manual de compra no suma al costo', () => {
    const r = analizarProducto(
      producto({
        proveedores: [oferta({ id: 'a', nombre: 'A', precioUnitario: 4000, envio: 0 })],
        ofertaCompraId: 'a',
      }),
      UMBRALES,
      null,
    );
    expect(r.datosEfectivos.costosCompra.precioCompraUnitario).toBe(4000);
  });
});
