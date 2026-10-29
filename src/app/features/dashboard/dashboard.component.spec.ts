import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { PRODUCTO_REPOSITORIO } from '../../data/producto-store.service';
import { ProductoRepositorio } from '../../data/ports/producto-repositorio';
import { Producto, ProductoNuevo, crearProductoNuevo } from '../../core/models/producto.model';
import { ConfiguracionStore } from '../../data/configuracion-store.service';
import {
  CLAVE_PRODUCTOS_LOCALES,
  ProductoRepositorioLocal,
} from '../../data/adapters/producto-repositorio-local';

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

function producto(id: string, precioVenta: number, observaciones = 0): Producto {
  return {
    ...crearProductoNuevo(),
    id,
    nombre: `Producto ${id}`,
    categoria: 'Audio',
    datos: {
      cantidad: 10,
      capitalDisponible: 500000,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: {
        precioVentaObjetivo: precioVenta,
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
    observaciones: Array.from({ length: observaciones }, (_, i) => ({
      id: `o${i}`,
      precio: precioVenta,
      vendedor: null,
      url: null,
      marca: null,
      modelo: null,
      caracteristicas: null,
      condicion: 'nuevo' as const,
      accesorios: null,
      garantia: null,
      envio: null,
      fechaConsulta: '2026-01-05T00:00:00.000Z',
    })),
    fuente: 'usuario',
    creadoEn: '2026-01-01T00:00:00.000Z',
    actualizadoEn: '2026-01-01T00:00:00.000Z',
  };
}

describe('DashboardComponent', () => {
  let repo: RepositorioFalso;

  beforeEach(() => {
    localStorage.clear();
    repo = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PRODUCTO_REPOSITORIO, useValue: repo }],
    });
  });

  it('muestra estado vacío y capital sin configurar', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.resumen().totalProductos).toBe(0);
    expect(el.textContent).toContain('Sin datos todavía');
    expect(el.textContent).toContain('Sin configurar');
  });

  it('resume los productos analizados', async () => {
    repo.items.push(producto('a', 300, 4), producto('b', 120, 1));
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.resumen().totalProductos).toBe(2);
    expect(comp.resumen().conCalculo).toBe(2);
    // Producto a: precio en mercado, margen alto -> no requiere investigación.
    // Producto b: 1 observación (insuficiente) -> requiere investigación.
    expect(comp.resumen().requierenInvestigacion).toBe(1);
    expect(comp.resumen().mayorGananciaIndividual?.productoId).toBe('a');
  });

  it('no falla al cargar con datos locales incompatibles y muestra el error', async () => {
    localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, JSON.stringify([{ id: 'x', nombre: 'roto' }]));
    TestBed.overrideProvider(PRODUCTO_REPOSITORIO, {
      useValue: new ProductoRepositorioLocal(localStorage),
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.store.errorLectura()).toBeTruthy();
    expect(comp.resumen().totalProductos).toBe(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('formato incompatible');
  });

  it('usa el capital de configuración en las tarjetas', async () => {
    const store = TestBed.inject(ConfiguracionStore);
    await store.guardar({
      capitalDisponible: 250000,
      moneda: 'ARS',
      umbrales: {
        margenMinimoPct: 15,
        capitalComprometidoMaxPct: 70,
        desviacionPrecioMercadoPct: 15,
        minObservacionesMercado: 3,
      },
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.capital()).toBe(250000);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('250.000');
  });
});
