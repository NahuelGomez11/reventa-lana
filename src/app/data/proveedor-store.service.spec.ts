import { TestBed } from '@angular/core/testing';
import { PROVEEDOR_REPOSITORIO, ProveedorCatalogoStore } from './proveedor-store.service';
import { ProveedorRepositorio } from './ports/proveedor-repositorio';
import { ErrorRepositorio } from './ports/producto-repositorio';
import { ProveedorCatalogo, ProveedorCatalogoNuevo, crearProveedorNuevo } from '../core/models/proveedor.model';

class RepositorioFalso implements ProveedorRepositorio {
  private items: ProveedorCatalogo[] = [];
  fallarLectura = false;
  fallarEscritura = false;

  async listar(): Promise<ProveedorCatalogo[]> {
    if (this.fallarLectura) throw new ErrorRepositorio('lectura', 'Falla de lectura simulada');
    return [...this.items];
  }

  async obtener(id: string): Promise<ProveedorCatalogo | null> {
    return this.items.find((p) => p.id === id) ?? null;
  }

  async crear(datos: ProveedorCatalogoNuevo): Promise<ProveedorCatalogo> {
    if (this.fallarEscritura) throw new ErrorRepositorio('escritura', 'Falla de escritura simulada');
    const p: ProveedorCatalogo = {
      ...datos,
      id: `id-${this.items.length + 1}`,
      creadoEn: '2026-01-01T00:00:00.000Z',
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    };
    this.items.push(p);
    return p;
  }

  async actualizar(id: string, cambios: Partial<ProveedorCatalogoNuevo>): Promise<ProveedorCatalogo> {
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

function datos(nombre = 'Proveedor X'): ProveedorCatalogoNuevo {
  return { ...crearProveedorNuevo(), nombre };
}

describe('ProveedorCatalogoStore', () => {
  let repo: RepositorioFalso;
  let store: ProveedorCatalogoStore;

  beforeEach(() => {
    repo = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [{ provide: PROVEEDOR_REPOSITORIO, useValue: repo }],
    });
    store = TestBed.inject(ProveedorCatalogoStore);
  });

  it('carga proveedores en el signal, ordenados por nombre', async () => {
    await store.crear(datos('Zeta'));
    await store.crear(datos('Alfa'));
    await store.cargar();
    expect(store.proveedores().length).toBe(2);
    expect(store.proveedores()[0].nombre).toBe('Alfa');
    expect(store.cargando()).toBe(false);
    expect(store.errorLectura()).toBeNull();
  });

  it('crea, actualiza y elimina reflejando el estado', async () => {
    const p = await store.crear(datos());
    expect(store.proveedores().length).toBe(1);
    expect(store.proveedorPorId(p.id)?.nombre).toBe('Proveedor X');

    await store.actualizar(p.id, { nombre: 'Renombrado' });
    expect(store.proveedorPorId(p.id)?.nombre).toBe('Renombrado');

    await store.eliminar(p.id);
    expect(store.proveedores().length).toBe(0);
  });

  it('proveedorPorId devuelve undefined para ids inexistentes', async () => {
    await store.cargar();
    expect(store.proveedorPorId('no-existe')).toBeUndefined();
  });

  it('expone error de lectura sin perder el estado previo', async () => {
    await store.crear(datos());
    repo.fallarLectura = true;
    await store.cargar();
    expect(store.errorLectura()).toContain('Falla de lectura');
    expect(store.proveedores().length).toBe(1);
  });

  it('expone error de escritura y propaga la excepción', async () => {
    repo.fallarEscritura = true;
    await expect(store.crear(datos())).rejects.toBeInstanceOf(ErrorRepositorio);
    expect(store.errorEscritura()).toContain('Falla de escritura');
    store.limpiarErrorEscritura();
    expect(store.errorEscritura()).toBeNull();
  });
});
