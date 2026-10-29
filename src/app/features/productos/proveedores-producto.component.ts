import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Moneda } from '../../core/models/analisis.model';
import { Proveedor } from '../../core/models/producto.model';
import { ProveedorCatalogo } from '../../core/models/proveedor.model';
import { ahoraIso, nuevoId } from '../../core/utils/id';
import { compararProveedores } from '../../domain/providers/comparacion-proveedores';
import {
  buscarOfertaDuplicada,
  registrarNuevoPrecio,
  TerminosOferta,
  validarTerminosOferta,
} from '../../domain/providers/ofertas';
import { FechaPipe, ImportePipe, NumeroPipe } from '../../shared/pipes/formato.pipe';

/**
 * Proveedores de este producto. Cada proveedor aparece una sola vez; sus cambios de precio
 * se registran como "nuevo precio" y el anterior queda en el historial.
 */
@Component({
  selector: 'app-proveedores-producto',
  standalone: true,
  imports: [ImportePipe, FechaPipe, NumeroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (proveedores().length === 0) {
      <p class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        Todavía no agregaste proveedores para este producto.
      </p>
    } @else {
      @if (cantidad() != null && cantidad()! > 0) {
        <p class="mb-3 text-xs text-slate-500">Comparamos para {{ cantidad() }} unidad(es).</p>
      } @else {
        <p class="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          Completá cuántas unidades vas a comprar para poder comparar proveedores.
        </p>
      }

      <ul class="grid gap-3">
        @for (p of proveedores(); track p.id) {
          <li
            class="rounded-2xl border p-4"
            [class]="esMejor(p.id) ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="text-base font-semibold text-slate-900">{{ p.nombre }}</p>
              <div class="flex flex-wrap gap-1.5">
                @if (esMejor(p.id)) {
                  <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Mejor opción</span>
                }
                @if (ofertaCompraId() === p.id) {
                  <span class="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">Usada para comprar</span>
                }
                @if (p.incompleto) {
                  <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Incompleto</span>
                }
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p class="text-xs text-slate-500">Precio por unidad</p>
                <p class="font-medium">{{ p.precioUnitario | importe: moneda() }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Envío (total)</p>
                <p class="font-medium">{{ p.envio | importe: moneda() }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Costo real por unidad</p>
                <p class="font-semibold">{{ costoEfectivo(p.id) | importe: moneda() }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Compra mínima / stock</p>
                <p class="font-medium">{{ p.compraMinima | numero }} / {{ p.stockDisponible ?? '—' }}</p>
              </div>
            </div>
            <p class="mt-2 text-xs text-slate-500">Precio vigente desde {{ p.fechaActualizacion | fecha }}</p>

            @if (recargoPct() != null) {
              <div class="mt-2 rounded-xl bg-slate-50 p-3 text-xs">
                <p class="font-medium text-slate-700">
                  Recargo configurado: {{ recargoPct() }}% · Precio de venta sugerido:
                  <span class="font-semibold text-slate-900">{{ precioSugerido(p.id) | importe: moneda() }}</span>
                </p>
                <p class="mt-1 text-slate-600">
                  Ganancia bruta por unidad: {{ gananciaBruta(p.id) | importe: moneda() }} ·
                  Margen bruto: {{ margenBruto(p.id) | numero }}%
                </p>
              </div>
            } @else {
              <p class="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">
                Falta configurar el recargo para esta categoría y gama (Ajustes).
              </p>
            }

            @if (motivo(p.id); as m) {
              <p class="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">{{ m }}</p>
            }

            <div class="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-sm">
              <button class="font-semibold text-brand-700" (click)="abrirEdicion(p)">Cambiar precio</button>
              <button class="font-medium text-slate-700" (click)="alternarHistorial(p.id)">
                Precios anteriores ({{ historialDe(p).length }})
              </button>
              <button class="ml-auto font-medium text-rose-700" (click)="quitar(p.id)">Quitar</button>
            </div>

            @if (editandoId() === p.id) {
              <div class="mt-3 rounded-2xl bg-slate-50 p-4">
                <p class="text-sm font-medium text-slate-800">Nuevo precio de {{ p.nombre }}</p>
                <p class="mt-0.5 text-xs text-slate-500">El precio actual se guarda en "Precios anteriores".</p>
                <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label class="block text-sm">
                    <span class="font-medium text-slate-800">Precio por unidad ({{ moneda() }})</span>
                    <input type="number" inputmode="decimal" class="mt-1 w-full input" [value]="ePrecio()" (input)="ePrecio.set(aNumero($event))" />
                  </label>
                  <label class="block text-sm">
                    <span class="font-medium text-slate-800">Envío total ({{ moneda() }})</span>
                    <input type="number" inputmode="decimal" class="mt-1 w-full input" [value]="eEnvio()" (input)="eEnvio.set(aNumero($event))" />
                  </label>
                  <label class="block text-sm">
                    <span class="font-medium text-slate-800">Compra mínima (unidades)</span>
                    <input type="number" inputmode="numeric" class="mt-1 w-full input" [value]="eCompra()" (input)="eCompra.set(aNumero($event))" />
                  </label>
                  <label class="block text-sm">
                    <span class="font-medium text-slate-800">Stock disponible</span>
                    <input type="number" inputmode="numeric" class="mt-1 w-full input" [value]="eStock()" (input)="eStock.set(aNumero($event))" />
                  </label>
                  <label class="block text-sm sm:col-span-2 lg:col-span-2">
                    <span class="font-medium text-slate-800">Notas (opcional)</span>
                    <input type="text" class="mt-1 w-full input" [value]="eObs()" (input)="eObs.set(aTexto($event))" />
                  </label>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" class="btn-primary flex-1 sm:flex-none" (click)="guardarEdicion(p)">Guardar nuevo precio</button>
                  <button type="button" class="btn-secondary flex-1 sm:flex-none" (click)="cancelarEdicion()">Cancelar</button>
                  @if (eError()) {
                    <span class="w-full text-sm text-rose-700">{{ eError() }}</span>
                  }
                </div>
              </div>
            }

            @if (historialAbierto() === p.id) {
              <div class="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                @if (historialDe(p).length === 0) {
                  <p>Todavía no hay precios anteriores.</p>
                } @else {
                  <p class="mb-2 font-medium text-slate-800">Del más reciente al más antiguo</p>
                  <ul class="space-y-2">
                    @for (r of historialOrdenado(p); track r.id) {
                      <li class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                        <p class="font-semibold">{{ r.precioUnitario | importe: moneda() }} por unidad</p>
                        <p class="text-xs text-slate-500">
                          Envío {{ r.envio | importe: moneda() }} · compra mínima {{ r.compraMinima | numero }} ·
                          del {{ r.vigenteDesde | fecha }} al {{ r.vigenteHasta | fecha }}
                        </p>
                      </li>
                    }
                  </ul>
                }
              </div>
            }
          </li>
        }
      </ul>

      @if (comparacion().advertencias.length > 0) {
        <ul class="mt-3 list-inside list-disc text-xs text-amber-700">
          @for (a of comparacion().advertencias; track a) {
            <li>{{ a }}</li>
          }
        </ul>
      }
    }

    <details class="mt-4 rounded-2xl border border-dashed border-slate-300 p-4">
      <summary class="cursor-pointer text-sm font-semibold text-brand-700">+ Agregar un proveedor a este producto</summary>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block text-sm sm:col-span-2">
          <span class="font-medium text-slate-800">Elegir de mis proveedores</span>
          <select class="mt-1 w-full input" [value]="fProveedorId() ?? ''" (change)="elegirDelCatalogo($event)">
            <option value="">Cargarlo a mano</option>
            @for (pc of catalogo(); track pc.id) {
              <option [value]="pc.id">{{ pc.nombre }}</option>
            }
          </select>
          @if (catalogo().length === 0) {
            <span class="mt-1 block text-xs text-slate-500">Todavía no tenés proveedores guardados.</span>
          }
        </label>
        <label class="block text-sm">
          <span class="font-medium text-slate-800">Nombre</span>
          <input type="text" class="mt-1 w-full input" [value]="fNombre()" (input)="fNombre.set(aTexto($event))" />
        </label>
        <label class="block text-sm">
          <span class="font-medium text-slate-800">Precio por unidad ({{ moneda() }})</span>
          <input type="number" inputmode="decimal" class="mt-1 w-full input" [value]="fPrecio()" (input)="fPrecio.set(aNumero($event))" />
        </label>
        <label class="block text-sm">
          <span class="font-medium text-slate-800">Envío total ({{ moneda() }})</span>
          <input type="number" inputmode="decimal" class="mt-1 w-full input" [value]="fEnvio()" (input)="fEnvio.set(aNumero($event))" />
        </label>
        <label class="block text-sm">
          <span class="font-medium text-slate-800">Compra mínima (unidades)</span>
          <input type="number" inputmode="numeric" class="mt-1 w-full input" [value]="fCompraMinima()" (input)="fCompraMinima.set(aNumero($event))" />
        </label>
        <label class="block text-sm">
          <span class="font-medium text-slate-800">Stock disponible</span>
          <input type="number" inputmode="numeric" class="mt-1 w-full input" [value]="fStock()" (input)="fStock.set(aNumero($event))" />
        </label>
        <label class="block text-sm sm:col-span-2">
          <span class="font-medium text-slate-800">Notas (opcional)</span>
          <input type="text" class="mt-1 w-full input" [value]="fObservaciones()" (input)="fObservaciones.set(aTexto($event))" />
        </label>
      </div>
      <button type="button" class="btn-primary mt-4 w-full sm:w-auto" (click)="agregar()">Agregar proveedor</button>
      @if (error()) {
        <p class="mt-2 text-sm text-rose-700">{{ error() }}</p>
      }
    </details>
  `,
})
export class ProveedoresProductoComponent {
  readonly proveedores = input.required<Proveedor[]>();
  readonly cantidad = input<number | null>(null);
  readonly otrosCostosAdquisicion = input<number | null>(null);
  readonly moneda = input<Moneda>('ARS');
  /** Catálogo de proveedores del usuario, para elegir sin cargar los datos a mano. */
  readonly catalogo = input<ProveedorCatalogo[]>([]);
  /** Oferta usada como costo de compra del producto (se marca en la tarjeta). */
  readonly ofertaCompraId = input<string | null>(null);
  /** Porcentaje de recargo configurado para la categoría+gama del artículo. Null = sin configurar. */
  readonly recargoPct = input<number | null>(null);
  readonly cambio = output<Proveedor[]>();

  readonly fProveedorId = signal<string | null>(null);
  readonly fUrl = signal<string | null>(null);
  readonly fNombre = signal('');
  readonly fPrecio = signal<number | null>(null);
  readonly fEnvio = signal<number | null>(0);
  readonly fCompraMinima = signal<number | null>(1);
  readonly fStock = signal<number | null>(null);
  readonly fObservaciones = signal('');
  readonly error = signal<string | null>(null);

  /** Edición de "nuevo precio" de una oferta existente. */
  readonly editandoId = signal<string | null>(null);
  readonly ePrecio = signal<number | null>(null);
  readonly eEnvio = signal<number | null>(0);
  readonly eCompra = signal<number | null>(1);
  readonly eStock = signal<number | null>(null);
  readonly eObs = signal('');
  readonly eError = signal<string | null>(null);

  readonly historialAbierto = signal<string | null>(null);

  readonly comparacion = computed(() =>
    compararProveedores(this.proveedores(), this.cantidad(), this.otrosCostosAdquisicion()),
  );

  esMejor(id: string): boolean {
    return this.comparacion().mejorId === id;
  }

  costoEfectivo(id: string): number | null {
    return this.comparacion().evaluaciones.find((e) => e.id === id)?.costoEfectivoUnitario ?? null;
  }

  precioSugerido(id: string): number | null {
    const costo = this.costoEfectivo(id);
    const r = this.recargoPct();
    if (costo == null || r == null) return null;
    return costo * (1 + r / 100);
  }

  gananciaBruta(id: string): number | null {
    const sugerido = this.precioSugerido(id);
    const costo = this.costoEfectivo(id);
    if (sugerido == null || costo == null) return null;
    return sugerido - costo;
  }

  margenBruto(id: string): number | null {
    const sugerido = this.precioSugerido(id);
    const ganancia = this.gananciaBruta(id);
    if (sugerido == null || ganancia == null || sugerido <= 0) return null;
    return (ganancia / sugerido) * 100;
  }

  motivo(id: string): string | null {
    const ev = this.comparacion().evaluaciones.find((e) => e.id === id);
    return ev && !ev.comparable ? ev.motivos.join(', ') : null;
  }

  historialDe(p: Proveedor) {
    return p.historial ?? [];
  }

  /** Precios anteriores, del más reciente al más antiguo (sin mutar el dato guardado). */
  historialOrdenado(p: Proveedor) {
    return [...this.historialDe(p)].reverse();
  }

  alternarHistorial(id: string): void {
    this.historialAbierto.update((actual) => (actual === id ? null : id));
  }

  aNumero(event: Event): number | null {
    const v = (event.target as HTMLInputElement).value;
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  aTexto(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  /** Al elegir un proveedor del catálogo, completa nombre y URL; el precio se ingresa igual. */
  elegirDelCatalogo(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id === '') {
      this.fProveedorId.set(null);
      this.fUrl.set(null);
      return;
    }
    const proveedor = this.catalogo().find((p) => p.id === id) ?? null;
    this.fProveedorId.set(id);
    this.fNombre.set(proveedor?.nombre ?? '');
    this.fUrl.set(proveedor?.web ?? null);
    this.error.set(null);
  }

  agregar(): void {
    const nombre = this.fNombre().trim();
    const precio = this.fPrecio();
    if (nombre === '') {
      this.error.set('Escribí el nombre del proveedor.');
      return;
    }
    if (precio == null) {
      this.error.set('Ingresá el precio por unidad.');
      return;
    }
    const terminos: TerminosOferta = {
      precioUnitario: precio,
      envio: this.fEnvio() ?? 0,
      compraMinima: this.fCompraMinima() ?? 1,
      stockDisponible: this.fStock(),
      observaciones: this.fObservaciones().trim() || null,
    };
    const errores = validarTerminosOferta(terminos);
    if (errores.length > 0) {
      this.error.set(`Revisá: ${errores.join('; ')}.`);
      return;
    }
    const existente = buscarOfertaDuplicada(this.proveedores(), {
      proveedorId: this.fProveedorId(),
      nombre,
    });
    if (existente) {
      this.error.set(
        `${existente.nombre} ya está en este producto. Usá "Cambiar precio" en su tarjeta.`,
      );
      return;
    }
    const proveedor: Proveedor = {
      id: nuevoId('prov'),
      proveedorId: this.fProveedorId(),
      nombre,
      url: this.fUrl(),
      precioUnitario: terminos.precioUnitario,
      stockDisponible: terminos.stockDisponible,
      envio: terminos.envio,
      compraMinima: terminos.compraMinima,
      garantia: null,
      observaciones: terminos.observaciones,
      fechaActualizacion: ahoraIso(),
      historial: [],
    };
    this.cambio.emit([...this.proveedores(), proveedor]);
    this.fProveedorId.set(null);
    this.fUrl.set(null);
    this.fNombre.set('');
    this.fPrecio.set(null);
    this.fEnvio.set(0);
    this.fCompraMinima.set(1);
    this.fStock.set(null);
    this.fObservaciones.set('');
    this.error.set(null);
  }

  abrirEdicion(p: Proveedor): void {
    this.editandoId.set(p.id);
    this.ePrecio.set(p.precioUnitario);
    this.eEnvio.set(p.envio);
    this.eCompra.set(p.compraMinima);
    this.eStock.set(p.stockDisponible);
    this.eObs.set(p.observaciones ?? '');
    this.eError.set(null);
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.eError.set(null);
  }

  guardarEdicion(p: Proveedor): void {
    const precio = this.ePrecio();
    if (precio == null) {
      this.eError.set('Ingresá el precio por unidad.');
      return;
    }
    const terminos: TerminosOferta = {
      precioUnitario: precio,
      envio: this.eEnvio() ?? 0,
      compraMinima: this.eCompra() ?? 1,
      stockDisponible: this.eStock(),
      observaciones: this.eObs().trim() || null,
    };
    const errores = validarTerminosOferta(terminos);
    if (errores.length > 0) {
      this.eError.set(`Revisá: ${errores.join('; ')}.`);
      return;
    }
    const actualizada = registrarNuevoPrecio(p, terminos, ahoraIso());
    if (actualizada === p) {
      this.eError.set('El precio es el mismo que el actual.');
      return;
    }
    this.cambio.emit(this.proveedores().map((o) => (o.id === p.id ? actualizada : o)));
    this.editandoId.set(null);
    this.eError.set(null);
  }

  quitar(id: string): void {
    if (this.editandoId() === id) this.cancelarEdicion();
    this.cambio.emit(this.proveedores().filter((p) => p.id !== id));
  }
}
