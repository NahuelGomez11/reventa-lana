import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import { ProductoFormComponent } from './producto-form.component';
import { PRODUCTO_REPOSITORIO } from '../../data/producto-store.service';
import { PROVEEDOR_REPOSITORIO } from '../../data/proveedor-store.service';
import { ProveedorRepositorio } from '../../data/ports/proveedor-repositorio';
import { ErrorRepositorio, ProductoRepositorio } from '../../data/ports/producto-repositorio';
import { Producto, ProductoNuevo, crearProductoNuevo } from '../../core/models/producto.model';
import {
  ProveedorCatalogo,
  ProveedorCatalogoNuevo,
  crearProveedorNuevo,
} from '../../core/models/proveedor.model';

@Component({ selector: 'app-detalle-dummy', standalone: true, template: 'detalle' })
class DetalleDummyComponent {}

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

class RepositorioCatalogoFalso implements ProveedorRepositorio {
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
    if (idx < 0) throw new ErrorRepositorio('no_encontrado', 'No existe');
    this.items[idx] = { ...this.items[idx], ...cambios, id };
    return this.items[idx];
  }
  async eliminar(id: string): Promise<void> {
    this.items = this.items.filter((p) => p.id !== id);
  }
}

function productoExistente(): Producto {
  return {
    ...crearProductoNuevo(),
    id: 'prod-1',
    nombre: 'Auriculares X',
    marca: 'MarcaA',
    categoria: 'Audio',
    datos: {
      cantidad: 10,
      capitalDisponible: 200000,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 100, otrosCostosAdquisicion: 0 },
      costosVenta: {
        precioVentaObjetivo: 250,
        comisionPorcentaje: 10,
        comisionMonto: null,
        envioCliente: 0,
        publicidadPorUnidad: 5,
        publicidadPresupuesto: null,
        impuestosPorcentaje: 0,
        impuestosMonto: null,
        otrosCostosVenta: 0,
      },
    },
    fuente: 'usuario',
    creadoEn: '2026-01-01T00:00:00.000Z',
    actualizadoEn: '2026-01-02T00:00:00.000Z',
  };
}

describe('ProductoFormComponent', () => {
  let repo: RepositorioFalso;
  let catalogo: RepositorioCatalogoFalso;

  beforeEach(() => {
    repo = new RepositorioFalso();
    catalogo = new RepositorioCatalogoFalso();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'productos/nuevo', component: ProductoFormComponent },
          { path: 'productos/:id/editar', component: ProductoFormComponent },
          { path: 'productos/:id', component: DetalleDummyComponent },
        ]),
        { provide: PRODUCTO_REPOSITORIO, useValue: repo },
        { provide: PROVEEDOR_REPOSITORIO, useValue: catalogo },
      ],
    });
  });

  async function montarNuevo(): Promise<
    [RouterTestingHarness, ProductoFormComponent, HTMLElement]
  > {
    const harness = await RouterTestingHarness.create('/productos/nuevo');
    const el = harness.routeDebugElement!.nativeElement as HTMLElement;
    return [harness, harness.routeDebugElement!.componentInstance as ProductoFormComponent, el];
  }

  it('guarda un producto completo y navega al detalle', async () => {
    const [harness, comp] = await montarNuevo();
    comp.form.patchValue({
      nombre: 'Producto Nuevo',
      cantidad: 5,
      precioCompraUnitario: 100,
      envioProveedor: 50,
      otrosCostosAdquisicion: 0,
      precioVentaObjetivo: 200,
      envioCliente: 0,
      otrosCostosVenta: 0,
      comisionPorcentaje: 10,
      impuestosPorcentaje: 0,
      publicidadPorUnidad: 0,
    });
    await comp.guardar();
    await harness.fixture.whenStable();

    expect(repo.items).toHaveLength(1);
    expect(repo.items[0].nombre).toBe('Producto Nuevo');
    expect(repo.items[0].datos.costosCompra.precioCompraUnitario).toBe(100);
  });

  it('no guarda si faltan datos obligatorios y explica qué falta', async () => {
    const [harness, comp, el] = await montarNuevo();
    await comp.guardar();
    harness.fixture.detectChanges();

    expect(repo.items).toHaveLength(0);
    expect(comp.mensaje()).toContain('Revisá los datos');
    expect(comp.faltantes().length).toBeGreaterThan(0);
    expect(el.textContent).toContain('Revisá');
  });

  it('muestra en vivo los cálculos cuando los datos están completos', async () => {
    const [, comp] = await montarNuevo();
    expect(comp.analisis().resultado).toBeNull();

    comp.form.patchValue({
      nombre: 'X',
      cantidad: 10,
      precioCompraUnitario: 100,
      envioProveedor: 0,
      otrosCostosAdquisicion: 0,
      precioVentaObjetivo: 200,
      envioCliente: 0,
      otrosCostosVenta: 0,
      comisionPorcentaje: 0,
      impuestosPorcentaje: 0,
      publicidadPorUnidad: 0,
    });

    const resultado = comp.analisis().resultado!;
    expect(resultado.inversionTotal).toBeCloseTo(1000, 2);
    expect(resultado.gananciaPotencialTotal).toBeCloseTo(1000, 2);
  });

  it('carga los datos existentes en modo edición', async () => {
    repo.items.push(productoExistente());
    const harness = await RouterTestingHarness.create('/productos/prod-1/editar');
    await harness.fixture.whenStable();
    const comp = harness.routeDebugElement!.componentInstance as ProductoFormComponent;

    expect(comp.modoEdicion).toBe(true);
    expect(comp.form.controls.nombre.value).toBe('Auriculares X');
    expect(comp.form.controls.precioCompraUnitario.value).toBe(100);
    expect(comp.form.controls.modoComision.value).toBe('porcentaje');
    expect(comp.analisis().resultado?.cantidad).toBe(10);
  });

  it('avisa cuando el producto a editar no existe', async () => {
    const harness = await RouterTestingHarness.create('/productos/inexistente/editar');
    await harness.fixture.whenStable();
    const comp = harness.routeDebugElement!.componentInstance as ProductoFormComponent;
    const el = harness.routeDebugElement!.nativeElement as HTMLElement;

    expect(comp.noEncontrado()).toBe(true);
    expect(el.textContent).toContain('No encontramos ese producto');
  });

  it('no guarda si se vacía un costo que el dominio necesita (validador de grupo)', async () => {
    const [harness, comp] = await montarNuevo();
    comp.form.patchValue({
      nombre: 'Producto Incompleto',
      cantidad: 5,
      precioCompraUnitario: 100,
      envioProveedor: null,
      otrosCostosAdquisicion: 0,
      precioVentaObjetivo: 200,
      envioCliente: 0,
      otrosCostosVenta: 0,
      comisionPorcentaje: 10,
      impuestosPorcentaje: 0,
      publicidadPorUnidad: 0,
    });
    await comp.guardar();
    await harness.fixture.whenStable();

    expect(repo.items).toHaveLength(0);
    expect(comp.form.invalid).toBe(true);
    expect(comp.faltantes()).toContain('Envío del proveedor');
    expect(comp.mensaje()).toContain('Revisá');
  });

  it('exige el control de comisión/impuestos/publicidad según el modo elegido', async () => {
    const [, comp] = await montarNuevo();
    const c = comp.form.controls;

    c.modoComision.setValue('monto');
    expect(c.comisionPorcentaje.value).toBeNull();
    c.comisionMonto.setValue(null);
    expect(c.comisionMonto.invalid).toBe(true);
    c.comisionMonto.setValue(7);
    expect(c.comisionMonto.valid).toBe(true);
    c.modoComision.setValue('porcentaje');
    expect(c.comisionMonto.value).toBeNull();
    expect(c.comisionPorcentaje.invalid).toBe(true);

    c.modoImpuestos.setValue('monto');
    expect(c.impuestosPorcentaje.value).toBeNull();
    c.impuestosMonto.setValue(null);
    expect(c.impuestosMonto.invalid).toBe(true);

    c.modoPublicidad.setValue('presupuesto');
    expect(c.publicidadPorUnidad.value).toBeNull();
    c.publicidadPresupuesto.setValue(null);
    expect(c.publicidadPresupuesto.invalid).toBe(true);
    c.publicidadPresupuesto.setValue(500);
    expect(c.publicidadPresupuesto.valid).toBe(true);
  });

  it('expone el catálogo y guarda el proveedor principal asignado', async () => {
    await catalogo.crear({ ...crearProveedorNuevo(), nombre: 'Distribuidora Sur' });
    const [harness, comp] = await montarNuevo();
    await harness.fixture.whenStable();

    expect(comp.proveedoresCatalogo().length).toBe(1);

    comp.form.patchValue({
      nombre: 'Producto con proveedor',
      cantidad: 5,
      precioCompraUnitario: 100,
      envioProveedor: 0,
      otrosCostosAdquisicion: 0,
      precioVentaObjetivo: 200,
      envioCliente: 0,
      otrosCostosVenta: 0,
      comisionPorcentaje: 0,
      impuestosPorcentaje: 0,
      publicidadPorUnidad: 0,
      proveedorPrincipalId: catalogo.items[0].id,
    });
    await comp.guardar();
    await harness.fixture.whenStable();

    expect(repo.items).toHaveLength(1);
    expect(repo.items[0].proveedorPrincipalId).toBe(catalogo.items[0].id);
  });

  it('permite elegir el proveedor principal desde el popup mostrando su dirección', async () => {
    await catalogo.crear({
      ...crearProveedorNuevo(),
      nombre: 'Distribuidora Sur',
      direccion: 'Av. Siempre Viva 742',
    });
    const [harness, comp] = await montarNuevo();
    await harness.fixture.whenStable();

    expect(comp.pickerAbierto()).toBe(false);
    comp.abrirPicker();
    harness.fixture.detectChanges();
    const el = harness.fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Distribuidora Sur');
    expect(el.textContent).toContain('Av. Siempre Viva 742');

    comp.elegirProveedor(catalogo.items[0].id);
    harness.fixture.detectChanges();
    expect(comp.pickerAbierto()).toBe(false);
    expect(comp.c.proveedorPrincipalId.value).toBe(catalogo.items[0].id);
  });

  it('en modo margen calcula el precio de venta a partir del margen deseado', async () => {
    const [harness, comp] = await montarNuevo();
    comp.form.patchValue({
      nombre: 'Con margen',
      cantidad: 10,
      precioCompraUnitario: 100,
      envioProveedor: 0,
      otrosCostosAdquisicion: 0,
      envioCliente: 0,
      otrosCostosVenta: 0,
      comisionPorcentaje: 0,
      impuestosPorcentaje: 0,
      publicidadPorUnidad: 0,
      modoPrecio: 'margen',
      margenObjetivoPct: 40,
    });
    harness.fixture.detectChanges();

    // precio = 100 / (1 - 0.4) = 166.67
    expect(comp.precioSugeridoPorMargen()).toBeCloseTo(166.67, 2);
    expect(comp.form.controls.precioVentaObjetivo.value).toBeCloseTo(166.67, 2);

    await comp.guardar();
    await harness.fixture.whenStable();
    expect(repo.items).toHaveLength(1);
    expect(repo.items[0].datos.costosVenta.precioVentaObjetivo).toBeCloseTo(166.67, 2);
  });

  it('usa los precios de otros lugares para comparar y ubicar el precio', async () => {
    const [harness, comp] = await montarNuevo();
    comp.form.patchValue({
      nombre: 'Comparable',
      cantidad: 10,
      precioCompraUnitario: 100,
      envioProveedor: 0,
      otrosCostosAdquisicion: 0,
      precioVentaObjetivo: 250,
      envioCliente: 0,
      otrosCostosVenta: 0,
      comisionPorcentaje: 0,
      impuestosPorcentaje: 0,
      publicidadPorUnidad: 0,
    });
    comp.borradorPrecioMercado.set(200);
    comp.agregarPrecioMercado();
    comp.borradorPrecioMercado.set(300);
    comp.agregarPrecioMercado();
    harness.fixture.detectChanges();

    expect(comp.observaciones()).toHaveLength(2);
    expect(comp.estadisticasMercado().minimo).toBe(200);
    expect(comp.estadisticasMercado().maximo).toBe(300);
    expect(comp.ubicacionMercado()).toBe('dentro');

    comp.form.controls.precioVentaObjetivo.setValue(350);
    expect(comp.ubicacionMercado()).toBe('por_encima');

    comp.quitarPrecioMercado(comp.observaciones()[0].id);
    expect(comp.observaciones()).toHaveLength(1);
  });
});
