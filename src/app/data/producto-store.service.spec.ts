import { TestBed } from '@angular/core/testing';
import { PRODUCTO_REPOSITORIO, ProductoStore } from './producto-store.service';
import { ErrorRepositorio, ProductoRepositorio } from './ports/producto-repositorio';
import { Producto, ProductoNuevo } from '../core/models/producto.model';
import { crearProductoBorrador, crearProductoNuevo } from '../core/models/producto.model';

class RepositorioFalso implements ProductoRepositorio {
  private items: Producto[] = [];
  fallarLectura = false;
  fallarEscritura = false;

  async listar(): Promise<Producto[]> {
    if (this.fallarLectura) throw new ErrorRepositorio('lectura', 'Falla de lectura simulada');
    return [...this.items];
  }

  async obtener(id: string): Promise<Producto | null> {
    return this.items.find((p) => p.id === id) ?? null;
  }

  async crear(datos: ProductoNuevo): Promise<Producto> {
    if (this.fallarEscritura) throw new ErrorRepositorio('escritura', 'Falla de escritura simulada');
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
    const antes = this.items.length;
    this.items = this.items.filter((p) => p.id !== id);
    if (this.items.length === antes) throw new ErrorRepositorio('no_encontrado', 'No existe');
  }
}

function datos(): ProductoNuevo {
  return { ...crearProductoNuevo(), nombre: 'Producto X' };
}

describe('ProductoStore', () => {
  let repo: RepositorioFalso;
  let store: ProductoStore;

  beforeEach(() => {
    repo = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [{ provide: PRODUCTO_REPOSITORIO, useValue: repo }],
    });
    store = TestBed.inject(ProductoStore);
  });

  it('carga productos en el signal', async () => {
    await store.crear(datos());
    await store.cargar();
    expect(store.productos().length).toBe(1);
    expect(store.cargando()).toBe(false);
    expect(store.errorLectura()).toBeNull();
  });

  it('crea, actualiza y elimina reflejando el estado', async () => {
    const p = await store.crear(datos());
    expect(store.productos().length).toBe(1);
    expect(store.productoPorId(p.id)?.nombre).toBe('Producto X');

    await store.actualizar(p.id, { nombre: 'Renombrado' });
    expect(store.productoPorId(p.id)?.nombre).toBe('Renombrado');

    await store.eliminar(p.id);
    expect(store.productos().length).toBe(0);
  });

  it('productoPorId devuelve undefined para ids inexistentes', async () => {
    await store.cargar();
    expect(store.productoPorId('no-existe')).toBeUndefined();
  });

  it('expone error de lectura sin perder el estado previo', async () => {
    await store.crear(datos());
    repo.fallarLectura = true;
    await store.cargar();
    expect(store.errorLectura()).toContain('Falla de lectura');
    expect(store.productos().length).toBe(1);
  });

  it('expone error de escritura y propaga la excepción', async () => {
    repo.fallarEscritura = true;
    await expect(store.crear(datos())).rejects.toBeInstanceOf(ErrorRepositorio);
    expect(store.errorEscritura()).toContain('Falla de escritura');
    store.limpiarErrorEscritura();
    expect(store.errorEscritura()).toBeNull();
  });

  it('crearProductoBorrador no trae valores financieros inventados', () => {
    const b = crearProductoBorrador();
    expect(b.datos.cantidad).toBeNull();
    expect(b.datos.costosVenta.precioVentaObjetivo).toBeNull();
    expect(b.fuente).toBe('usuario');
  });
});
