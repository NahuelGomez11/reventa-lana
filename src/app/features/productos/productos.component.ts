import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto } from '../../core/models/producto.model';
import { ConfiguracionStore } from '../../data/configuracion-store.service';
import { ProductoStore } from '../../data/producto-store.service';
import { CLAVE_PRODUCTOS_LOCALES } from '../../data/adapters/producto-repositorio-local';
import { CLAVE_PROVEEDORES_LOCALES } from '../../data/adapters/proveedor-repositorio-local';
import { AnalisisProducto, analizarProducto } from '../../domain/analysis/analisis-producto';
import { EstadoVacioComponent } from '../../shared/components/estado-vacio.component';
import { VeredictoChipComponent } from '../../shared/components/veredicto-chip.component';
import { EscalaPreciosComponent } from '../../shared/components/escala-precios.component';
import { construirEscala } from '../../shared/escala-precios';
import { ImportePipe } from '../../shared/pipes/formato.pipe';
import { Veredicto, veredictoDe } from '../../shared/veredicto';

interface FilaProducto {
  producto: Producto;
  analisis: AnalisisProducto;
  veredicto: Veredicto;
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [RouterLink, EstadoVacioComponent, VeredictoChipComponent, EscalaPreciosComponent, ImportePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Productos</h1>
        <p class="mt-1 text-sm text-slate-600">Cada producto que analizaste, con su veredicto.</p>
      </div>
      <a routerLink="/productos/nuevo" class="btn-primary hidden md:inline-flex">+ Nuevo producto</a>
      <a routerLink="/comparar" class="btn-secondary hidden md:inline-flex">Comparar similares</a>
      <button type="button" class="btn-secondary" (click)="modoVincular.set(!modoVincular())">
        {{ modoVincular() ? 'Cancelar vincular' : 'Vincular artículos' }}
      </button>

    </div>

    @if (store.errorLectura()) {
      <div class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ store.errorLectura() }}
      </div>
    }

    @if (store.errorEscritura()) {
      <div class="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <span>{{ store.errorEscritura() }}</span>
        <button class="text-xs font-semibold underline" (click)="store.limpiarErrorEscritura()">Cerrar</button>
      </div>
    }

    @if (store.cargando()) {
      <p class="mt-6 text-sm text-slate-500">Cargando productos…</p>
    } @else if (filas().length === 0) {
      <div class="mt-5">
        <app-estado-vacio
          [titulo]="'Todavía no hay análisis guardados'"
          [mensaje]="'Cargá el primero para ver si te conviene comprarlo.'"
          [accionTexto]="'Crear análisis'"
          [accionRuta]="'/productos/nuevo'"
        />
      </div>

    @if (modoVincular()) {
      <div class="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
        Selecciona 2 articulos para vincularlos (se fusionan sin duplicar). Seleccionados: {{ seleccionados().size }}
        @if (seleccionados().size === 2) {
          <button type="button" class="btn-primary ml-2" (click)="vincularSeleccionados()">Vincular seleccionados</button>
        }
      </div>
    }

    } @else {
      <!-- Móvil: tarjetas -->
      <ul class="mt-5 grid gap-3 md:hidden">
        @for (fila of filas(); track fila.producto.id) {
          <li class="card p-4">
            <div class="flex items-start justify-between gap-3">
              @if (modoVincular()) {
                <input type="checkbox" class="mt-1 h-5 w-5" [checked]="seleccionados().has(fila.producto.id)" (change)="alternarSeleccion(fila.producto.id)" />
              }
              <a [routerLink]="['/productos', fila.producto.id]" class="min-w-0">
                <span class="block truncate text-base font-semibold text-slate-900">
                  {{ fila.producto.nombre || 'Sin nombre' }}
                </span>
                @if (fila.producto.categoria) {
                  <span class="text-xs text-slate-500">{{ fila.producto.categoria }}</span>
                }
              </a>
              <div class="flex shrink-0 items-center gap-1.5">
                @if (!fila.analisis.resultado) {
                  <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Incompleto</span>
                }
                <app-veredicto-chip [veredicto]="fila.veredicto" />
              </div>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p class="text-xs text-slate-500">Ganancia total</p>
                <p class="font-semibold text-slate-900">
                  {{ fila.analisis.resultado?.gananciaPotencialTotal | importe: moneda() }}
                </p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Lo que pagás</p>
                <p class="font-semibold text-slate-900">
                  {{ fila.analisis.resultado?.inversionTotal | importe: moneda() }}
                </p>
              </div>
            </div>
            <div class="mt-2">
              <app-escala-precios
                [escala]="escalaDe(fila.analisis)"
                [moneda]="moneda()"
                [compacta]="true"
              />
            </div>
            <div class="mt-3 flex items-center justify-end gap-3 border-t border-slate-100 pt-3 text-sm">
              <a [routerLink]="['/productos', fila.producto.id, 'editar']" class="font-medium text-brand-700">Editar</a>
              @if (confirmarId() === fila.producto.id) {
                <span class="text-slate-600">¿Borrar?</span>
                <button class="font-semibold text-rose-700" (click)="eliminar(fila.producto.id)">Sí, borrar</button>
                <button class="text-slate-600" (click)="confirmarId.set(null)">No</button>
              } @else {
                <button class="font-medium text-rose-700" (click)="confirmarId.set(fila.producto.id)">Borrar</button>
              }
            </div>
          </li>
        }
      </ul>

      <!-- Escritorio: tabla -->
      <div class="card mt-5 hidden overflow-x-auto p-0 md:block">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3 font-medium">Producto</th>
              <th class="px-4 py-3 font-medium">Veredicto</th>
              <th class="px-4 py-3 text-right font-medium">Lo que pagás</th>
              <th class="px-4 py-3 text-right font-medium">Ganancia total</th>
              <th class="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (fila of filas(); track fila.producto.id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3">
                  @if (modoVincular()) {
                    <input type="checkbox" class="mr-2 h-4 w-4" [checked]="seleccionados().has(fila.producto.id)" (change)="alternarSeleccion(fila.producto.id)" />
                  }
                  <a [routerLink]="['/productos', fila.producto.id]" class="font-semibold text-brand-700 hover:underline">
                    {{ fila.producto.nombre || 'Sin nombre' }}
                  </a>
                  @if (!fila.analisis.resultado) {
                    <span class="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Incompleto</span>
                  }
                  @if (fila.producto.categoria) {
                    <div class="text-xs text-slate-500">{{ fila.producto.categoria }}</div>
                  }
                </td>
                <td class="px-4 py-3"><app-veredicto-chip [veredicto]="fila.veredicto" /></td>
                <td class="px-4 py-3 text-right">{{ fila.analisis.resultado?.inversionTotal | importe: moneda() }}</td>
                <td class="px-4 py-3 text-right font-semibold">
                  {{ fila.analisis.resultado?.gananciaPotencialTotal | importe: moneda() }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-3 text-sm">
                    <a [routerLink]="['/productos', fila.producto.id, 'editar']" class="text-brand-700 hover:underline">Editar</a>
                    @if (confirmarId() === fila.producto.id) {
                      <button class="font-semibold text-rose-700 hover:underline" (click)="eliminar(fila.producto.id)">
                        Sí, borrar
                      </button>
                      <button class="text-slate-600 hover:underline" (click)="confirmarId.set(null)">No</button>
                    } @else {
                      <button class="text-rose-700 hover:underline" (click)="confirmarId.set(fila.producto.id)">
                        Borrar
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <p class="mt-3 text-xs text-slate-500">
        Los cálculos se actualizan solos cuando cambian tus precios o tus proveedores.
      </p>
    }
  `,
})
export class ProductosComponent {
  readonly store = inject(ProductoStore);
  private readonly config = inject(ConfiguracionStore);

  readonly confirmarId = signal<string | null>(null);
  readonly modoVincular = signal(false);
  readonly seleccionados = signal<Set<string>>(new Set());

  readonly moneda = computed(() => this.config.configuracion().moneda);

  readonly filas = computed<FilaProducto[]>(() => {
    const cfg = this.config.configuracion();
    return this.store
      .productos()
      .map((producto) => {
        const analisis = analizarProducto(producto, cfg.umbrales, cfg.capitalDisponible);
        return { producto, analisis, veredicto: veredictoDe(analisis) };
      })
      .sort((a, b) => b.producto.actualizadoEn.localeCompare(a.producto.actualizadoEn));
  });

  escalaDe(analisis: AnalisisProducto) {
    return construirEscala(analisis, analisis.datosEfectivos.costosVenta.precioVentaObjetivo ?? null);
  }

  constructor() {
    this.config.cargar();
    void this.store.cargar();
  }

  async eliminar(id: string): Promise<void> {
    this.confirmarId.set(null);
    try {
      await this.store.eliminar(id);
    } catch {
      // El error queda expuesto por store.errorEscritura().
    }
  }

  alternarSeleccion(id: string): void {
    const s = new Set(this.seleccionados());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.seleccionados.set(s);
  }

  async vincularSeleccionados(): Promise<void> {
    const ids = Array.from(this.seleccionados());
    if (ids.length !== 2) return;
    try {
      await this.store.fusionar(ids[0], ids[1]);
      this.seleccionados.set(new Set());
      this.modoVincular.set(false);
    } catch {
      // ignore
    }
  }

  /**
   * Carga el dataset de PRUEBA (ficticio, sellado [DEMO]) para probar la app.
   * Solo aparece en el estado vacío y no sobrescribe datos del usuario.
   */
}
