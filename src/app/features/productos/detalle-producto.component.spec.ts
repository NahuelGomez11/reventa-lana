import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DetalleProductoComponent } from './detalle-producto.component';
import { PRODUCTO_REPOSITORIO } from '../../data/producto-store.service';
import { ErrorRepositorio, ProductoRepositorio } from '../../data/ports/producto-repositorio';
import {
  ObservacionMercado,
  Producto,
  ProductoNuevo,
  Proveedor,
  crearProductoNuevo,
} from '../../core/models/producto.model';

@Component({ selector: 'app-lista-dummy', standalone: true, template: 'lista' })
class ListaDummyComponent {}

class RepositorioFalso implements ProductoRepositorio {
  items: Producto[] = [];
  async listar(): Promise<Producto[]> {
    return [...this.items];
  }
  async obtener(id: string): Promise<Producto | null> {
    return this.items.find((p) => p.id === id) ?? null;
  }
  async crear(datos: ProductoNuevo): Promise<Producto> {
    const p: Producto = {
      ...datos,
      id: `id-${this.items.length + 1}`,
      fuente: 'usuario',
      creadoEn: '2026-01-01T00:00:00.000Z',
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    };
    this.items.push(p);
    return p;
  }
  async actualizar(id: string, cambios: Partial<ProductoNuevo>): Promise<Producto> {
    const idx = this.items.findIndex((p) => p.id === id);
    if (idx < 0) throw new ErrorRepositorio('no_encontrado', 'No existe');
    this.items[idx] = { ...this.items[idx], ...cambios, id };
    return this.items[idx];
  }
  async eliminar(id: string): Promise<void> {
    this.items = this.items.filter((p) => p.id !== id);
  }
}

function producto(id = 'p1'): Producto {
  return {
    ...crearProductoNuevo(),
    id,
    nombre: 'Zapatillas',
    categoria: 'Calzado',
    datos: {
      cantidad: 10,
      capitalDisponible: 300000,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: {
        precioVentaObjetivo: 200,
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
    fuente: 'usuario',
    creadoEn: '2026-01-01T00:00:00.000Z',
    actualizadoEn: '2026-01-01T00:00:00.000Z',
  };
}

describe('DetalleProductoComponent', () => {
  let repo: RepositorioFalso;

  beforeEach(() => {
    repo = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'productos', component: ListaDummyComponent },
          { path: 'productos/:id', component: DetalleProductoComponent },
        ]),
        { provide: PRODUCTO_REPOSITORIO, useValue: repo },
      ],
    });
  });

  async function montar(
    id: string,
  ): Promise<[RouterTestingHarness, DetalleProductoComponent, HTMLElement]> {
    const harness = await RouterTestingHarness.create(`/productos/${id}`);
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    const el = harness.routeDebugElement!.nativeElement as HTMLElement;
    return [harness, harness.routeDebugElement!.componentInstance as DetalleProductoComponent, el];
  }

  it('analiza el producto y muestra los cálculos', async () => {
    repo.items.push(producto());
    const [, comp, el] = await montar('p1');

    expect(comp.producto()?.nombre).toBe('Zapatillas');
    expect(comp.analisis().resultado?.gananciaPotencialTotal).toBeCloseTo(1000, 2);
    expect(el.textContent).toContain('Resultados calculados');
    expect(el.textContent).toContain('Zapatillas');
  });

  it('muestra estado vacío si el producto no existe', async () => {
    const [, comp, el] = await montar('no-existe');
    expect(comp.producto()).toBeNull();
    expect(el.textContent).toContain('No se encontró el producto');
  });

  it('guarda observaciones de mercado y actualiza la mediana', async () => {
    repo.items.push(producto());
    const [harness, comp] = await montar('p1');
    expect(comp.analisis().estadisticas.mediana).toBeNull();

    const observaciones: ObservacionMercado[] = [100, 200, 300].map((precio, i) => ({
      id: `o${i}`,
      precio,
      vendedor: 'Vendedor',
      url: null,
      marca: null,
      modelo: null,
      caracteristicas: null,
      condicion: 'nuevo',
      accesorios: null,
      garantia: null,
      envio: null,
      fechaConsulta: '2026-01-05T00:00:00.000Z',
    }));
    comp.actualizarObservaciones(observaciones);
    await harness.fixture.whenStable();

    expect(repo.items[0].observaciones).toHaveLength(3);
    expect(comp.analisis().estadisticas.mediana).toBe(200);
  });

  it('guarda proveedores y marca el de mejor costo efectivo', async () => {
    repo.items.push(producto());
    const [harness, comp] = await montar('p1');

    const proveedores: Proveedor[] = [
      {
        id: 'a',
        nombre: 'Caro',
        url: null,
        precioUnitario: 120,
        stockDisponible: null,
        envio: 0,
        compraMinima: 1,
        garantia: null,
        observaciones: null,
        fechaActualizacion: '2026-01-05T00:00:00.000Z',
      },
      {
        id: 'b',
        nombre: 'Barato',
        url: null,
        precioUnitario: 90,
        stockDisponible: null,
        envio: 0,
        compraMinima: 1,
        garantia: null,
        observaciones: null,
        fechaActualizacion: '2026-01-05T00:00:00.000Z',
      },
    ];
    comp.actualizarProveedores(proveedores);
    await harness.fixture.whenStable();

    expect(repo.items[0].proveedores).toHaveLength(2);
    expect(comp.analisis().comparacion.mejorId).toBe('b');
  });

  it('guarda los precios de simulación', async () => {
    repo.items.push(producto());
    const [harness, comp] = await montar('p1');

    comp.actualizarSimulacion([150, 200, 250]);
    await harness.fixture.whenStable();

    expect(repo.items[0].simulacionPrecios).toEqual([150, 200, 250]);
  });

  it('elimina el producto y navega a la lista', async () => {
    repo.items.push(producto());
    const [harness, comp] = await montar('p1');

    await comp.eliminarProducto();
    await harness.fixture.whenStable();

    expect(repo.items).toHaveLength(0);
  });
});
