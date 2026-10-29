import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductosComponent } from './productos.component';
import { PRODUCTO_REPOSITORIO } from '../../data/producto-store.service';
import { ProductoRepositorio } from '../../data/ports/producto-repositorio';
import { Producto, ProductoNuevo, crearProductoNuevo } from '../../core/models/producto.model';

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
  async actualizar(id: string): Promise<Producto> {
    return this.items.find((p) => p.id === id)!;
  }
  async eliminar(id: string): Promise<void> {
    this.items = this.items.filter((p) => p.id !== id);
  }
}

function conDatos(id: string, nombre: string, actualizadoEn: string): Producto {
  return {
    ...crearProductoNuevo(),
    id,
    nombre,
    categoria: 'Audio',
    datos: {
      cantidad: 10,
      capitalDisponible: 200000,
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
    actualizadoEn,
  };
}

describe('ProductosComponent', () => {
  let repo: RepositorioFalso;

  beforeEach(() => {
    localStorage.clear();
    repo = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PRODUCTO_REPOSITORIO, useValue: repo },
      ],
    });
  });

  it('muestra estado vacío cuando no hay productos', async () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Todavía no hay análisis guardados');
  });

  it('lista los productos con su análisis y ordena por actualización', async () => {
    repo.items.push(
      conDatos('a', 'Viejo', '2026-01-01T00:00:00.000Z'),
      conDatos('b', 'Nuevo', '2026-02-01T00:00:00.000Z'),
    );
    const fixture = TestBed.createComponent(ProductosComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.filas()).toHaveLength(2);
    expect(comp.filas()[0].producto.nombre).toBe('Nuevo');
    expect(comp.filas()[0].analisis.resultado?.inversionTotal).toBeCloseTo(1000, 2);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nuevo');
    expect(el.textContent).toContain('Audio');
  });

  it('elimina un producto tras confirmación', async () => {
    repo.items.push(conDatos('a', 'ParaBorrar', '2026-01-01T00:00:00.000Z'));
    const fixture = TestBed.createComponent(ProductosComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.confirmarId.set('a');
    await comp.eliminar('a');
    expect(repo.items).toHaveLength(0);
    expect(comp.filas()).toHaveLength(0);
  });

  it('muestra error de lectura si el almacenamiento falla', async () => {
    const roto: ProductoRepositorio = {
      listar: async () => {
        throw new Error('boom');
      },
      obtener: async () => null,
      crear: async () => {
        throw new Error('boom');
      },
      actualizar: async () => {
        throw new Error('boom');
      },
      eliminar: async () => undefined,
    };
    TestBed.overrideProvider(PRODUCTO_REPOSITORIO, { useValue: roto });
    const fixture = TestBed.createComponent(ProductosComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.store.errorLectura()).toContain('boom');
  });
});
