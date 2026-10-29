import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProveedorCatalogo } from '../../core/models/proveedor.model';
import { Proveedor } from '../../core/models/producto.model';
import { ConfiguracionStore } from '../../data/configuracion-store.service';
import { ProductoStore } from '../../data/producto-store.service';
import { ProveedorCatalogoStore } from '../../data/proveedor-store.service';
import { compararProveedores } from '../../domain/providers/comparacion-proveedores';
import { EstadoVacioComponent } from '../../shared/components/estado-vacio.component';
import { ImportePipe, NumeroPipe } from '../../shared/pipes/formato.pipe';

interface FilaProveedor {
  productoId: string;
  productoNombre: string;
  proveedor: Proveedor;
  costoEfectivoUnitario: number | null;
  comparable: boolean;
  motivos: string[];
  esMejor: boolean;
}

function crearFormularioCatalogo() {
  return new FormGroup({
    nombre: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    telefono: new FormControl<string>('', { nonNullable: true }),
    email: new FormControl<string>('', { nonNullable: true }),
    web: new FormControl<string>('', { nonNullable: true }),
    direccion: new FormControl<string>('', { nonNullable: true }),
    notas: new FormControl<string>('', { nonNullable: true }),
  });
}

function textoONull(v: string): string | null {
  const t = v.trim();
  return t === '' ? null : t;
}

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    EstadoVacioComponent,
    ImportePipe,
    NumeroPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Proveedores</h1>
      <p class="mt-1 text-sm text-slate-600">
        GuardA� a tus proveedores una sola vez y elegilos en cada producto.
      </p>
      <button type="button" class="btn-secondary mt-3" (click)="modoVincular.set(!modoVincular())">
        {{ modoVincular() ? 'Cancelar vincular' : 'Vincular proveedores' }}
      </button>
      @if (modoVincular()) {
        <div class="mt-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
          Selecciona 2 proveedores para vincularlos (se fusionan sin duplicar). Seleccionados: {{ seleccionados().size }}
          @if (seleccionados().size === 2) {
            <button type="button" class="btn-primary ml-2" (click)="vincularSeleccionados()">Vincular seleccionados</button>
          }
        </div>
      }
    </div>

    @if (catalogo.errorLectura()) {
      <div class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ catalogo.errorLectura() }}
      </div>
    }

    @if (catalogo.errorEscritura()) {
      <div class="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <span>{{ catalogo.errorEscritura() }}</span>
        <button class="text-xs font-semibold underline" (click)="catalogo.limpiarErrorEscritura()">Cerrar</button>
      </div>
    }

    <!-- Mis proveedores -->
    <section class="mt-5">
      <details class="card p-0" [open]="catalogo.proveedores().length === 0 || editandoId() !== null">
        <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold text-slate-900">
          {{ editandoId() ? 'Editar proveedor' : '+ Agregar proveedor' }}
          <span class="text-sm font-normal text-slate-500">{{ catalogo.proveedores().length }} guardados</span>
        </summary>

        <form class="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="guardar()">
          <label class="block text-sm sm:col-span-2">
            <span class="font-medium text-slate-800">Nombre del proveedor</span>
            <input
              type="text"
              class="mt-1 w-full input"
              [class.input-error]="nombreInvalido()"
              placeholder="Ej.: Distribuidora Sur"
              formControlName="nombre"
            />
            @if (nombreInvalido()) {
              <span class="mt-1 block text-xs text-rose-600">Escribí el nombre del proveedor.</span>
            }
          </label>
          <label class="block text-sm">
            <span class="font-medium text-slate-800">Teléfono (opcional)</span>
            <input type="text" class="mt-1 w-full input" formControlName="telefono" />
          </label>
          <label class="block text-sm">
            <span class="font-medium text-slate-800">Email (opcional)</span>
            <input type="text" class="mt-1 w-full input" formControlName="email" />
          </label>
          <label class="block text-sm">
            <span class="font-medium text-slate-800">Página web (opcional)</span>
            <input type="text" class="mt-1 w-full input" placeholder="https://…" formControlName="web" />
          </label>
          <label class="block text-sm">
            <span class="font-medium text-slate-800">Dirección (opcional)</span>
            <input type="text" class="mt-1 w-full input" formControlName="direccion" />
          </label>
          <label class="block text-sm sm:col-span-2">
            <span class="font-medium text-slate-800">Notas (opcional)</span>
            <input type="text" class="mt-1 w-full input" placeholder="Ej.: Entrega en 24 h" formControlName="notas" />
          </label>

          <div class="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" class="btn-primary flex-1 sm:flex-none sm:px-8" [disabled]="guardando()">
              {{ editandoId() ? 'Guardar cambios' : 'Guardar proveedor' }}
            </button>
            @if (editandoId()) {
              <button type="button" class="btn-secondary flex-1 sm:flex-none" (click)="cancelarEdicion()">Cancelar</button>
            }
            @if (mensaje()) {
              <span class="text-sm text-rose-700">{{ mensaje() }}</span>
            }
          </div>
        </form>
      </details>

      @if (catalogo.cargando()) {
        <p class="mt-4 text-sm text-slate-500">Cargando proveedores…</p>
      } @else if (catalogo.proveedores().length === 0) {
        <p class="mt-4 text-sm text-slate-600">Sin proveedores cargados. Agregá el primero arriba.</p>
      } @else {
        <ul class="mt-4 grid gap-3 sm:grid-cols-2">
          @for (p of catalogo.proveedores(); track p.id) {
            <li class="card p-4">
              @if (modoVincular()) {
                <input type="checkbox" class="mb-2 h-5 w-5" [checked]="seleccionados().has(p.id)" (change)="alternarSeleccion(p.id)" />
              }
              <p class="text-base font-semibold text-slate-900">{{ p.nombre }}</p>
              <div class="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                @if (p.telefono) {
                  <a [href]="'tel:' + p.telefono" class="font-medium text-brand-700">Tel: {{ p.telefono }}</a>
                }
                @if (p.email) {
                  <a [href]="'mailto:' + p.email" class="font-medium text-brand-700">Email: {{ p.email }}</a>
                }
                @if (p.web) {
                  <a [href]="p.web" target="_blank" rel="noopener noreferrer" class="truncate font-medium text-brand-700">Web: {{ p.web }}</a>
                }
                @if (p.direccion) {
                  <span>Dirección: {{ p.direccion }}</span>
                }
                @if (p.notas) {
                  <span class="text-slate-500">{{ p.notas }}</span>
                }
              </div>
              <div class="mt-3 flex items-center justify-end gap-3 border-t border-slate-100 pt-3 text-sm">
                <button class="font-medium text-brand-700" (click)="editar(p)">Editar</button>
                @if (confirmarId() === p.id) {
                  <span class="text-slate-600">¿Borrar?</span>
                  <button class="font-semibold text-rose-700" (click)="eliminar(p.id)">Sí, borrar</button>
                  <button class="text-slate-600" (click)="confirmarId.set(null)">No</button>
                } @else {
                  <button class="font-medium text-rose-700" (click)="confirmarId.set(p.id)">Borrar</button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </section>

    <!-- Comparación por producto -->
    <section class="mt-8">
      <h2 class="text-lg font-bold tracking-tight">Cuál conviene más por producto</h2>
      <p class="mt-1 text-sm text-slate-600">
        Se compara el costo real por unidad: precio, envío y otros gastos repartidos.
      </p>

      @if (store.errorLectura()) {
        <div class="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {{ store.errorLectura() }}
        </div>
      }

      @if (store.cargando()) {
        <p class="mt-4 text-sm text-slate-500">Cargando…</p>
      } @else if (filas().length === 0) {
        <div class="mt-4">
          <app-estado-vacio
            [titulo]="'Sin proveedores cargados en productos'"
            [mensaje]="'Cuando agregues proveedores a un producto, vas a ver acá cuál te conviene más.'"
            [accionTexto]="'Ir a mis productos'"
            [accionRuta]="'/productos'"
          />
        </div>
      } @else {
        <ul class="mt-4 grid gap-3 sm:grid-cols-2">
          @for (fila of filas(); track fila.proveedor.id) {
            <li class="card p-4" [class.ring-emerald-300]="fila.esMejor">
              <div class="flex items-start justify-between gap-2">
                <a [routerLink]="['/productos', fila.productoId]" class="min-w-0 truncate text-sm font-semibold text-brand-700">
                  {{ fila.productoNombre || 'Sin nombre' }}
                </a>
                @if (fila.esMejor) {
                  <span class="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Mejor opción
                  </span>
                }
              </div>
              <p class="mt-2 font-medium text-slate-900">{{ fila.proveedor.nombre }}</p>
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p class="text-xs text-slate-500">Precio por unidad</p>
                  <p class="font-medium">{{ fila.proveedor.precioUnitario | importe: moneda() }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-500">Costo real por unidad</p>
                  <p class="font-semibold">{{ fila.costoEfectivoUnitario | importe: moneda() }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-500">Compra mínima</p>
                  <p class="font-medium">{{ fila.proveedor.compraMinima | numero }} u.</p>
                </div>
                <div>
                  <p class="text-xs text-slate-500">Stock</p>
                  <p class="font-medium">{{ fila.proveedor.stockDisponible | numero }}</p>
                </div>
              </div>
              @if (fila.motivos.length > 0) {
                <p class="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">{{ fila.motivos.join(', ') }}</p>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class ProveedoresComponent {
  readonly store = inject(ProductoStore);
  readonly catalogo = inject(ProveedorCatalogoStore);
  private readonly config = inject(ConfiguracionStore);

  readonly moneda = computed(() => this.config.configuracion().moneda);

  readonly form = crearFormularioCatalogo();
  readonly guardando = signal(false);
  readonly editandoId = signal<string | null>(null);
  readonly confirmarId = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly modoVincular = signal(false);
  readonly seleccionados = signal<Set<string>>(new Set());
  private readonly enviado = signal(false);

  readonly nombreInvalido = computed(
    () => this.form.controls.nombre.invalid && (this.enviado() || this.form.controls.nombre.touched),
  );

  readonly filas = computed<FilaProveedor[]>(() => {
    const resultado: FilaProveedor[] = [];
    for (const producto of this.store.productos()) {
      const comparacion = compararProveedores(
        producto.proveedores,
        producto.datos.cantidad,
        producto.datos.costosCompra.otrosCostosAdquisicion,
      );
      for (const proveedor of producto.proveedores) {
        const evaluacion = comparacion.evaluaciones.find((e) => e.id === proveedor.id);
        resultado.push({
          productoId: producto.id,
          productoNombre: producto.nombre,
          proveedor,
          costoEfectivoUnitario: evaluacion?.costoEfectivoUnitario ?? null,
          comparable: evaluacion?.comparable ?? false,
          motivos: evaluacion?.motivos ?? [],
          esMejor: comparacion.mejorId === proveedor.id,
        });
      }
    }
    return resultado;
  });

  constructor() {
    this.config.cargar();
    void this.store.cargar();
    void this.catalogo.cargar();
  }

  async guardar(): Promise<void> {
    this.enviado.set(true);
    this.mensaje.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mensaje.set('Revisá el nombre del proveedor.');
      return;
    }
    const v = this.form.getRawValue();
    const datos = {
      nombre: v.nombre.trim(),
      telefono: textoONull(v.telefono),
      email: textoONull(v.email),
      web: textoONull(v.web),
      direccion: textoONull(v.direccion),
      notas: textoONull(v.notas),
    };
    this.guardando.set(true);
    try {
      const id = this.editandoId();
      if (id) {
        await this.catalogo.actualizar(id, datos);
      } else {
        await this.catalogo.crear(datos);
      }
      this.reiniciarFormulario();
    } catch {
      // El error queda expuesto por catalogo.errorEscritura().
    } finally {
      this.guardando.set(false);
    }
  }

  editar(p: ProveedorCatalogo): void {
    this.mensaje.set(null);
    this.enviado.set(false);
    this.editandoId.set(p.id);
    this.form.setValue({
      nombre: p.nombre,
      telefono: p.telefono ?? '',
      email: p.email ?? '',
      web: p.web ?? '',
      direccion: p.direccion ?? '',
      notas: p.notas ?? '',
    });
  }

  cancelarEdicion(): void {
    this.reiniciarFormulario();
  }

  private reiniciarFormulario(): void {
    this.editandoId.set(null);
    this.enviado.set(false);
    this.form.reset({ nombre: '', telefono: '', email: '', web: '', direccion: '', notas: '' });
  }

  async eliminar(id: string): Promise<void> {
    this.confirmarId.set(null);
    try {
      await this.catalogo.eliminar(id);
      if (this.editandoId() === id) this.reiniciarFormulario();
    } catch {
      // El error queda expuesto por catalogo.errorEscritura().
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
      await this.catalogo.fusionar(ids[0], ids[1]);
      this.seleccionados.set(new Set());
      this.modoVincular.set(false);
    } catch {
      // ignore
    }
  }
}
