import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProveedoresComponent } from './proveedores.component';
import { PRODUCTO_REPOSITORIO } from '../../data/producto-store.service';
import { PROVEEDOR_REPOSITORIO } from '../../data/proveedor-store.service';
import { ProductoRepositorio } from '../../data/ports/producto-repositorio';
import { ProveedorRepositorio } from '../../data/ports/proveedor-repositorio';
import { Producto, ProductoNuevo, Proveedor, crearProductoNuevo } from '../../core/models/producto.model';
import { ProveedorCatalogo, ProveedorCatalogoNuevo } from '../../core/models/proveedor.model';

class CatalogoFalso implements ProveedorRepositorio {
  items: ProveedorCatalogo[] = [];
  async listar(): Promise<ProveedorCatalogo[]> {
    return [...this.items];
  }
  async obtener(id: string): Promise<ProveedorCatalogo | null> {
    return this.items.find((p) => p.id === id) ?? null;
  }
  async crear(datos: ProveedorCatalogoNuevo): Promise<ProveedorCatalogo> {
    const p: ProveedorCatalogo = {
      ...datos,
      id: `cat-${this.items.length + 1}`,
      creadoEn: '2026-01-01T00:00:00.000Z',
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    };
    this.items.push(p);
    return p;
  }
  async actualizar(id: string, cambios: Partial<ProveedorCatalogoNuevo>): Promise<ProveedorCatalogo> {
    const idx = this.items.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error('No existe');
    this.items[idx] = { ...this.items[idx], ...cambios, id };
    return this.items[idx];
  }
  async eliminar(id: string): Promise<void> {
    this.items = this.items.filter((p) => p.id !== id);
  }
}

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

function proveedor(id: string, nombre: string, precio: number, envio = 0): Proveedor {
  return {
    id,
    nombre,
    url: null,
    precioUnitario: precio,
    stockDisponible: null,
    envio,
    compraMinima: 1,
    garantia: null,
    observaciones: null,
    fechaActualizacion: '2026-01-05T00:00:00.000Z',
  };
}

function conProveedores(): Producto {
  return {
    ...crearProductoNuevo(),
    id: 'p1',
    nombre: 'Teclado',
    datos: {
      cantidad: 10,
      capitalDisponible: null,
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
    proveedores: [proveedor('a', 'Caro', 120), proveedor('b', 'Barato', 90)],
    fuente: 'usuario',
    creadoEn: '2026-01-01T00:00:00.000Z',
    actualizadoEn: '2026-01-01T00:00:00.000Z',
  };
}

describe('ProveedoresComponent', () => {
  let repo: RepositorioFalso;
  let catalogo: CatalogoFalso;

  beforeEach(() => {
    localStorage.clear();
    repo = new RepositorioFalso();
    catalogo = new CatalogoFalso();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PRODUCTO_REPOSITORIO, useValue: repo },
        { provide: PROVEEDOR_REPOSITORIO, useValue: catalogo },
      ],
    });
  });

  it('muestra estado vacío sin proveedores', async () => {
    const fixture = TestBed.createComponent(ProveedoresComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.filas()).toHaveLength(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin proveedores cargados');
  });

  it('lista proveedores de todos los productos y marca el mejor costo efectivo', async () => {
    repo.items.push(conProveedores());
    const fixture = TestBed.createComponent(ProveedoresComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.filas()).toHaveLength(2);
    const mejor = comp.filas().find((f) => f.esMejor);
    expect(mejor?.proveedor.nombre).toBe('Barato');
    expect(mejor?.costoEfectivoUnitario).toBe(90);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Teclado');
    expect(el.textContent).toContain('Mejor opción');
  });

  it('crea un proveedor en el catálogo', async () => {
    const fixture = TestBed.createComponent(ProveedoresComponent);
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(comp.catalogo.proveedores()).toHaveLength(0);

    comp.form.setValue({
      nombre: 'Distribuidora Sur',
      telefono: '+54 11 5555-1234',
      email: 'ventas@ejemplo.test',
      web: 'https://ejemplo.test',
      direccion: 'Av. Siempre Viva 742',
      notas: 'Buen precio en volumen',
    });
    await comp.guardar();
    await fixture.whenStable();

    expect(catalogo.items).toHaveLength(1);
    const creado = catalogo.items[0];
    expect(creado.nombre).toBe('Distribuidora Sur');
    expect(creado.telefono).toBe('+54 11 5555-1234');
    expect(creado.email).toBe('ventas@ejemplo.test');
    expect(creado.web).toBe('https://ejemplo.test');
    expect(creado.direccion).toBe('Av. Siempre Viva 742');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Distribuidora Sur');
  });
});
