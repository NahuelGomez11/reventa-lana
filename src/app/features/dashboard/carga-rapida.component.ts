import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Moneda } from '../../core/models/analisis.model';
import { Producto, ProductoNuevo, Proveedor, crearProductoNuevo } from '../../core/models/producto.model';
import { ProveedorCatalogo } from '../../core/models/proveedor.model';
import { ahoraIso, nuevoId } from '../../core/utils/id';
import { ProductoStore } from '../../data/producto-store.service';
import { ConfiguracionStore } from '../../data/configuracion-store.service';
import { ProveedorCatalogoStore } from '../../data/proveedor-store.service';
import { buscarOfertaDuplicada, validarTerminosOferta } from '../../domain/providers/ofertas';
import { SelectorCategoriaComponent } from '../../shared/components/selector-categoria.component';
import { SelectorProveedorComponent } from '../../shared/components/selector-proveedor.component';
import { CategoriasStore } from '../../data/categorias-store.service';

@Component({
  selector: 'app-carga-rapida',
  standalone: true,
  imports: [SelectorCategoriaComponent, SelectorProveedorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Botón sticky -->
    <button
      type="button"
      class="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[#050914] shadow-[0_0_28px_-4px_rgba(139,92,246,0.9)] ring-4 ring-white md:bottom-8 md:right-8"
      aria-label="Carga rápida"
      (click)="abrir()"
    >
      <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke-width="2.4" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>

    @if (abierto()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4" (click)="cerrar()">
        <div class="w-full max-w-lg rounded-t-3xl bg-white p-5 ring-1 ring-slate-700 md:rounded-3xl" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-100">Carga rápida</h2>
            <button type="button" class="text-slate-400 hover:text-slate-100" (click)="cerrar()" aria-label="Cerrar">✕</button>
          </div>
          <p class="mt-1 text-xs text-slate-400">Solo lo esencial: artículo, proveedor y precio. Lo demás después.</p>

          @if (modo() === 'buscar') {
            <div class="mt-4">
              <input
                type="text"
                class="input w-full"
                placeholder="Buscar artículo por nombre..."
                [value]="filtro()"
                (input)="filtro.set($any($event.target).value)"
                autofocus
              />
              @if (filtro().trim() !== '' && filtrados().length > 0) {
                <ul class="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800">
                  @for (p of filtrados(); track p.id) {
                    <li>
                      <button type="button" class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700" (click)="seleccionar(p)">
                        <span class="font-medium text-slate-100">{{ p.nombre || 'Sin nombre' }}</span>
                        @if (p.marca) { <span class="text-xs text-slate-400"> · {{ p.marca }}</span> }
                      </button>
                    </li>
                  }
                </ul>
              }
              @if (filtro().trim() !== '' && filtrados().length === 0) {
                <p class="mt-2 text-xs text-slate-400">No existe. Crealo abajo.</p>
              }
            </div>
            <button type="button" class="btn-secondary mt-3 w-full" (click)="modo.set('nuevo')">
              + Crear artículo nuevo
            </button>
          }

          @if (modo() === 'nuevo') {
            <div class="mt-4">
              <label class="block text-sm">
                <span class="font-medium text-slate-200">Nombre del artA-culo</span>
                <input type="text" class="mt-1 w-full input" [value]="nNombre()" (input)="nNombre.set($any($event.target).value)" autofocus />
              </label>
              <div class="mt-3">
                <app-selector-categoria [valor]="nCategoria()" (cambio)="nCategoria.set($event)" />
              </div>
            </div>
            <div class="mt-3 flex gap-2">
              <button type="button" class="btn-secondary" (click)="modo.set('buscar')">Volver</button>
              <button type="button" class="btn-primary flex-1" (click)="iniciarCotizacionNuevo()" [disabled]="nNombre().trim() === ''">
                Continuar
              </button>
            </div>
          }

          @if (modo() === 'cotizar') {
            @if (productoSeleccionado()) {
              <div class="mt-3 rounded-xl bg-slate-800 p-3">
                <p class="text-sm font-medium text-slate-100">{{ productoSeleccionado()!.nombre }}</p>
              </div>
            }
            <div class="mt-3 grid gap-3">
              <app-selector-proveedor
                [etiqueta]="'Proveedor'"
                [proveedorId]="pProveedorId()"
                [nombre]="pNombre()"
                (cambio)="onProveedorCambio($event)"
              />
              <div class="grid grid-cols-2 gap-3">
                <label class="block text-sm">
                  <span class="font-medium text-slate-200">Precio ({{ moneda() }})</span>
                  <input type="number" inputmode="decimal" class="mt-1 w-full input" [value]="pPrecio()" (input)="pPrecio.set(toNum($event))" />
                </label>
                <label class="block text-sm">
                  <span class="font-medium text-slate-200">Envío ({{ moneda() }})</span>
                  <input type="number" inputmode="decimal" class="mt-1 w-full input" [value]="pEnvio()" (input)="pEnvio.set(toNum($event))" />
                </label>
              </div>
            </div>

            @if (error()) {
              <p class="mt-2 text-sm text-rose-400">{{ error() }}</p>
            }

            <div class="mt-4 flex gap-2">
              <button type="button" class="btn-secondary" (click)="cancelar()">Cancelar</button>
              <button type="button" class="btn-primary flex-1" (click)="guardarCotizacion()" [disabled]="guardando() || pNombre().trim() === '' || pPrecio() == null">
                {{ guardando() ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
            @if (guardadoMsg()) {
              <p class="mt-2 text-sm font-medium text-emerald-400">{{ guardadoMsg() }}</p>
            }
          }
        </div>
      </div>
    }
  `,
})
export class CargaRapidaComponent {
  readonly store = inject(ProductoStore);
  readonly config = inject(ConfiguracionStore);
  readonly catalogoStore = inject(ProveedorCatalogoStore);
  readonly categoriasStore = inject(CategoriasStore);

  readonly abierto = signal(false);
  readonly modo = signal<'buscar' | 'nuevo' | 'cotizar'>('buscar');
  readonly filtro = signal('');
  readonly productoSeleccionado = signal<Producto | null>(null);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly guardadoMsg = signal<string | null>(null);

  readonly nNombre = signal('');
  readonly nCategoria = signal('');

  readonly pProveedorId = signal<string | null>(null);
  readonly pNombre = signal('');
  readonly pPrecio = signal<number | null>(null);
  readonly pEnvio = signal<number | null>(0);

  readonly moneda = computed(() => this.config.configuracion().moneda);
  readonly catalogo = this.catalogoStore.proveedores;

  readonly filtrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    if (q === '') return [];
    return this.store.productos().filter((p) => (p.nombre || '').toLowerCase().includes(q)).slice(0, 8);
  });

  constructor() {
    this.config.cargar();
    void this.catalogoStore.cargar();
    void this.store.cargar();
  }

  abrir(): void {
    this.abierto.set(true);
    this.modo.set('buscar');
    this.filtro.set('');
    this.error.set(null);
    this.guardadoMsg.set(null);
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  seleccionar(p: Producto): void {
    this.productoSeleccionado.set(p);
    this.modo.set('cotizar');
    this.error.set(null);
    this.guardadoMsg.set(null);
  }

  iniciarCotizacionNuevo(): void {
    const nombre = this.nNombre().trim();
    if (!nombre) return;
    const base = crearProductoNuevo();
    const prod: Producto = {
      ...base,
      id: '',
      nombre,
      categoria: this.nCategoria().trim(),
      fuente: 'usuario',
      creadoEn: ahoraIso(),
      actualizadoEn: ahoraIso(),
      proveedores: [],
      observaciones: [],
      simulacionPrecios: [],
    };
    this.productoSeleccionado.set(prod);
    this.modo.set('cotizar');
    this.error.set(null);
    this.guardadoMsg.set(null);
  }

  onProveedorCambio(ev: { id: string | null; nombre: string }): void {
    this.pProveedorId.set(ev.id);
    this.pNombre.set(ev.nombre);
  }

  toNum(event: Event): number | null {
    const v = (event.target as HTMLInputElement).value;
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  cancelar(): void {
    this.modo.set('buscar');
    this.productoSeleccionado.set(null);
    this.resetProveedor();
    this.nNombre.set('');
    this.filtro.set('');
  }

  private resetProveedor(): void {
    this.pProveedorId.set(null);
    this.pNombre.set('');
    this.pPrecio.set(null);
    this.pEnvio.set(0);
    this.error.set(null);
  }

  async guardarCotizacion(): Promise<void> {
    this.guardando.set(true);
    this.error.set(null);
    this.guardadoMsg.set(null);
    try {
      const nombreProv = this.pNombre().trim();
      const precio = this.pPrecio();
      if (!nombreProv || precio == null) {
        this.error.set('Completá nombre y precio.');
        return;
      }
      const terminos = {
        precioUnitario: precio,
        envio: this.pEnvio() ?? 0,
        compraMinima: 1,
        stockDisponible: null,
        observaciones: null,
      };
      const errs = validarTerminosOferta(terminos);
      if (errs.length > 0) {
        this.error.set(`Revisá: ${errs.join('; ')}.`);
        return;
      }

      const nuevoProv: Proveedor = {
        id: nuevoId('prov'),
        proveedorId: this.pProveedorId(),
        nombre: nombreProv,
        url: this.catalogo().find((c) => c.id === this.pProveedorId())?.web ?? null,
        precioUnitario: terminos.precioUnitario,
        stockDisponible: terminos.stockDisponible,
        envio: terminos.envio,
        compraMinima: terminos.compraMinima,
        garantia: null,
        observaciones: terminos.observaciones,
        fechaActualizacion: ahoraIso(),
        historial: [],
        incompleto: this.pProveedorId() == null,
      };

      const prod = this.productoSeleccionado()!;
      if (prod.id === '') {
        if (prod.categoria) this.categoriasStore.asegurar(prod.categoria);
        const nuevo: ProductoNuevo = {
          ...crearProductoNuevo(),
          nombre: prod.nombre,
          categoria: prod.categoria,
          proveedorPrincipal: nombreProv,
          proveedorPrincipalId: this.pProveedorId(),
          proveedores: [nuevoProv],
          datos: crearProductoNuevo().datos,
          observaciones: [],
          simulacionPrecios: [],
        };
        await this.store.crear(nuevo);
        this.guardadoMsg.set('Artículo y cotización guardados.');
      } else {
        const existente = buscarOfertaDuplicada(prod.proveedores, { proveedorId: this.pProveedorId(), nombre: nombreProv });
        if (existente) {
          this.error.set(`${existente.nombre} ya está en este artículo. Usá "Cambiar precio" en su tarjeta.`);
          return;
        }
        await this.store.actualizar(prod.id, { proveedores: [...prod.proveedores, nuevoProv] });
        this.guardadoMsg.set('Cotización agregada.');
      }

      await this.store.cargar();
      setTimeout(() => {
        this.cancelar();
        this.cerrar();
      }, 900);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      this.guardando.set(false);
    }
  }
}
