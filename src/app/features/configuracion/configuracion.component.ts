import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Moneda } from '../../core/models/analisis.model';
import { ConfiguracionStore } from '../../data/configuracion-store.service';
import { ProductoStore } from '../../data/producto-store.service';
import { ProveedorCatalogoStore } from '../../data/proveedor-store.service';
import { RecargosStore } from '../../data/recargos-store.service';
import { RECARGOS_DEFECTO } from '../../core/models/recargos.model';
import { BackupService } from '../../data/backup.service';
import { CLAVE_PRODUCTOS_LOCALES } from '../../data/adapters/producto-repositorio-local';
import { CLAVE_PROVEEDORES_LOCALES } from '../../data/adapters/proveedor-repositorio-local';import {
  aNumeroONull,
  enteroPositivo,
  noNegativo,
  porcentajeValido,
} from '../../core/forms/validadores';
import { CampoNumeroComponent } from '../../shared/components/campo-numero.component';
import { UMBRALES_DEFECTO } from '../../core/models/configuracion.model';

function crearFormulario() {
  return new FormGroup({
    capitalDisponible: new FormControl<number | null>(null, [noNegativo]),
    moneda: new FormControl<Moneda>('ARS', { nonNullable: true }),
    margenMinimoPct: new FormControl<number | null>(
      UMBRALES_DEFECTO.margenMinimoPct,
      [Validators.required, porcentajeValido],
    ),
    capitalComprometidoMaxPct: new FormControl<number | null>(
      UMBRALES_DEFECTO.capitalComprometidoMaxPct,
      [Validators.required, porcentajeValido],
    ),
    desviacionPrecioMercadoPct: new FormControl<number | null>(
      UMBRALES_DEFECTO.desviacionPrecioMercadoPct,
      [Validators.required, porcentajeValido],
    ),
    minObservacionesMercado: new FormControl<number | null>(
      UMBRALES_DEFECTO.minObservacionesMercado,
      [Validators.required, enteroPositivo],
    ),
  });
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [ReactiveFormsModule, CampoNumeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Ajustes</h1>
      <p class="mt-1 text-sm text-slate-600">
        Acá configurás tu dinero y qué consideramos riesgoso. Se guarda en este navegador.
      </p>
    </div>

    @if (store.error()) {
      <div class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ store.error() }}
      </div>
    }

    <form class="mt-5 grid gap-5 md:grid-cols-2" [formGroup]="form" (ngSubmit)="guardar()">
      <section class="card">
        <h2 class="text-base font-semibold text-slate-900">Tu dinero</h2>
        <div class="mt-4 grid gap-4">
          <app-campo-numero
            [etiqueta]="'¿Cuánto dinero tenés para comprar? (' + form.controls.moneda.value + ')'"
            [control]="form.controls.capitalDisponible"
            [mostrarErrores]="enviado()"
            [ayuda]="'Opcional. Sirve para saber qué parte de tu dinero estás usando.'"
          />
          <label class="block text-sm">
            <span class="font-medium text-slate-800">Moneda</span>
            <select class="mt-1 w-full input" formControlName="moneda">
              <option value="ARS">Pesos (ARS)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </label>
        </div>
      </section>

      <section class="card">
        <h2 class="text-base font-semibold text-slate-900">Qué consideramos riesgoso</h2>
        <p class="mt-1 text-sm text-slate-600">
          Son números de referencia que podés cambiar. No predicen si el producto se va a vender.
        </p>
        <div class="mt-4 grid gap-4">
          <app-campo-numero
            [etiqueta]="'Ganancia mínima que querés (%)'"
            [control]="form.controls.margenMinimoPct"
            [mostrarErrores]="enviado()"
            [ayuda]="'Si ganás menos que esto, te avisamos.'"
          />
          <app-campo-numero
            [etiqueta]="'Parte de tu dinero que es mucho (%)'"
            [control]="form.controls.capitalComprometidoMaxPct"
            [mostrarErrores]="enviado()"
            [ayuda]="'Si una compra usa más que esto de tu dinero, te avisamos.'"
          />
          <app-campo-numero
            [etiqueta]="'Diferencia de precio con otros lugares (%)'"
            [control]="form.controls.desviacionPrecioMercadoPct"
            [mostrarErrores]="enviado()"
            [ayuda]="'Si tu precio se aleja más que esto de los demás, te avisamos.'"
          />
          <app-campo-numero
            [etiqueta]="'Precios mínimos para comparar'"
            [control]="form.controls.minObservacionesMercado"
            [mostrarErrores]="enviado()"
            [minimo]="1"
            [ayuda]="'Cuántos precios de otros lugares necesitás para comparar bien.'"
          />
        </div>
      </section>

      <div class="sticky bottom-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur md:static md:col-span-2 md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <button type="submit" class="btn-primary flex-1 md:flex-none md:px-8">Guardar</button>
        <button type="button" class="btn-secondary flex-1 md:flex-none" (click)="restaurar()">
          Volver a los valores originales
        </button>
        @if (guardado()) {
          <span class="text-sm font-medium text-emerald-700">Listo, se guardó.</span>
        }
      </div>
    </form>

    <section class="card mt-6">
      <h2 class="text-base font-semibold text-slate-900">Recargo por categoría y gama</h2>
      <p class="mt-1 text-sm text-slate-600">
        Porcentaje de recargo sobre el costo total de adquisición. Se usa para calcular el precio de venta sugerido.
      </p>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          class="input flex-1"
          placeholder="Nueva categoría"
          [formControl]="nuevaCategoria"
        />
        <button type="button" class="btn-secondary" (click)="agregarCategoriaRecargo()">Agregar</button>
      </div>

      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-2 py-2 font-medium">Categoría</th>
              <th class="px-2 py-2 text-right font-medium">Baja %</th>
              <th class="px-2 py-2 text-right font-medium">Media %</th>
              <th class="px-2 py-2 text-right font-medium">Alta %</th>
              <th class="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            @for (g of recargosForm.controls; track $index) {
              <tr class="border-t border-slate-100">
                <td class="px-2 py-2">
                  <input class="input w-full" [formControl]="$any(asGroup(g).get('nombre'))" />
                </td>
                <td class="px-2 py-2">
                  <input type="number" class="input w-20 text-right" [formControl]="$any(asGroup(g).get('baja'))" />
                </td>
                <td class="px-2 py-2">
                  <input type="number" class="input w-20 text-right" [formControl]="$any(asGroup(g).get('media'))" />
                </td>
                <td class="px-2 py-2">
                  <input type="number" class="input w-20 text-right" [formControl]="$any(asGroup(g).get('alta'))" />
                </td>
                <td class="px-2 py-2 text-right">
                  <button type="button" class="text-xs text-rose-700 hover:underline" (click)="quitarCategoriaRecargo($index)">
                    Quitar
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" class="btn-primary" (click)="guardarRecargos()">Guardar recargos</button>
        <button type="button" class="btn-secondary" (click)="restaurarRecargos()">Restaurar predeterminados</button>
        @if (guardadoRecargos()) {
          <span class="text-sm font-medium text-emerald-700">Listo, se guardó.</span>
        }
      </div>
    </section>

    <section class="card mt-6">
      <h2 class="text-base font-semibold text-slate-900">Copia de seguridad</h2>
      <p class="mt-1 text-sm text-slate-600">
        Exportá tus artículos y proveedores a un archivo para enviarlo por WhatsApp. Al importar, se fusionan sin duplicar.
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" class="btn-primary" (click)="exportarRespaldo()">Exportar respaldo</button>
        <label class="btn-secondary cursor-pointer">
          {{ importando() ? 'Importando…' : 'Importar respaldo' }}
          <input type="file" accept="application/json" class="hidden" (change)="importarRespaldo($event)" [disabled]="importando()" />
        </label>
      </div>
      @if (mensajeBackup()) {
        <p class="mt-3 text-sm font-medium text-emerald-700">{{ mensajeBackup() }}</p>
      }
    </section>

    <section class="card mt-6 border border-rose-500/30">
      <h2 class="text-base font-semibold text-rose-300">Zona peligrosa</h2>
      <p class="mt-1 text-sm text-slate-600">
        Borra todos los productos y proveedores guardados en este navegador. No se puede deshacer.
      </p>
      @if (mensajeBorrado()) {
        <p class="mt-3 text-sm font-medium text-emerald-400">{{ mensajeBorrado() }}</p>
      }
      @if (confirmandoBorrado()) {
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="btn-danger flex-1 md:flex-none md:px-8"
            [disabled]="borrando()"
            (click)="borrarTodo()"
          >
            {{ borrando() ? 'Borrando…' : 'Sí, borrar todo' }}
          </button>
          <button
            type="button"
            class="btn-secondary flex-1 md:flex-none"
            [disabled]="borrando()"
            (click)="confirmandoBorrado.set(false)"
          >
            Cancelar
          </button>
        </div>
      } @else {
        <button
          type="button"
          class="btn-soft-danger mt-4"
          (click)="confirmandoBorrado.set(true)"
        >
          Borrar todos los datos
        </button>
      }
    </section>
  `,
})
export class ConfiguracionComponent {
  readonly store = inject(ConfiguracionStore);
  readonly productoStore = inject(ProductoStore);
  readonly proveedorStore = inject(ProveedorCatalogoStore);
  readonly recargosStore = inject(RecargosStore);
  readonly backup = inject(BackupService);
  readonly form = crearFormulario();
  readonly recargosForm = new FormArray<FormGroup>([]);
  readonly nuevaCategoria = new FormControl<string>('', { nonNullable: true });
  readonly guardadoRecargos = signal(false);
  readonly importando = signal(false);
  readonly mensajeBackup = signal<string | null>(null);
  readonly enviado = signal(false);
  readonly guardado = signal(false);
  readonly confirmandoBorrado = signal(false);
  readonly borrando = signal(false);
  readonly mensajeBorrado = signal<string | null>(null);

  constructor() {
    this.store.cargar();
    this.recargosStore.cargar();
    this.cargarRecargosForm();
    const c = this.store.configuracion();
    this.form.setValue({
      capitalDisponible: c.capitalDisponible,
      moneda: c.moneda,
      margenMinimoPct: c.umbrales.margenMinimoPct,
      capitalComprometidoMaxPct: c.umbrales.capitalComprometidoMaxPct,
      desviacionPrecioMercadoPct: c.umbrales.desviacionPrecioMercadoPct,
      minObservacionesMercado: c.umbrales.minObservacionesMercado,
    });
  }

  private cargarRecargosForm(): void {
    this.recargosForm.clear();
    const cats = this.recargosStore.config().categorias;
    for (const [nombre, val] of Object.entries(cats)) {
      this.recargosForm.push(
        new FormGroup({
          nombre: new FormControl<string>(nombre, { nonNullable: true, validators: [Validators.required] }),
          baja: new FormControl<number | null>(val.baja, [Validators.required, noNegativo, porcentajeValido]),
          media: new FormControl<number | null>(val.media, [Validators.required, noNegativo, porcentajeValido]),
          alta: new FormControl<number | null>(val.alta, [Validators.required, noNegativo, porcentajeValido]),
        }),
      );
    }
  }

  async guardarRecargos(): Promise<void> {
    this.guardadoRecargos.set(false);
    if (this.recargosForm.invalid) {
      this.recargosForm.markAllAsTouched();
      return;
    }
    const categorias: Record<string, { baja: number; media: number; alta: number }> = {};
    for (const g of this.recargosForm.controls) {
      const v = g.getRawValue();
      categorias[v.nombre.trim()] = {
        baja: aNumeroONull(v.baja) ?? 0,
        media: aNumeroONull(v.media) ?? 0,
        alta: aNumeroONull(v.alta) ?? 0,
      };
    }
    try {
      await this.recargosStore.guardar({ categorias });
      this.guardadoRecargos.set(true);
    } catch {
      this.guardadoRecargos.set(false);
    }
  }

  agregarCategoriaRecargo(): void {
    const nombre = this.nuevaCategoria.value.trim();
    if (!nombre) return;
    // evitar duplicados
    const existe = this.recargosForm.controls.some(
      (g) => (g.get('nombre')?.value ?? '').trim().toLowerCase() === nombre.toLowerCase(),
    );
    if (existe) return;
    this.recargosForm.push(
      new FormGroup({
        nombre: new FormControl<string>(nombre, { nonNullable: true, validators: [Validators.required] }),
        baja: new FormControl<number | null>(0, [Validators.required, noNegativo, porcentajeValido]),
        media: new FormControl<number | null>(0, [Validators.required, noNegativo, porcentajeValido]),
        alta: new FormControl<number | null>(0, [Validators.required, noNegativo, porcentajeValido]),
      }),
    );
    this.nuevaCategoria.setValue('');
  }

  quitarCategoriaRecargo(index: number): void {
    this.recargosForm.removeAt(index);
  }

  async restaurarRecargos(): Promise<void> {
    this.recargosStore.restaurarPredeterminados();
    this.cargarRecargosForm();
    this.guardadoRecargos.set(true);
  }

  exportarRespaldo(): void {
    this.backup.exportar();
    this.mensajeBackup.set('Respaldo descargado. Envialo por WhatsApp.');
  }

  async importarRespaldo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    this.importando.set(true);
    this.mensajeBackup.set(null);
    try {
      const res = await this.backup.importar(archivo);
      this.mensajeBackup.set(res.mensaje);
    } catch (e) {
      this.mensajeBackup.set(e instanceof Error ? e.message : 'Error al importar.');
    } finally {
      this.importando.set(false);
      input.value = '';
    }
  }

  asGroup(g: any): FormGroup {
    return g as FormGroup;
  }

  async guardar(): Promise<void> {
    this.enviado.set(true);
    this.guardado.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    try {
      await this.store.guardar({
        capitalDisponible: aNumeroONull(v.capitalDisponible),
        moneda: v.moneda,
        umbrales: {
          margenMinimoPct: aNumeroONull(v.margenMinimoPct) ?? UMBRALES_DEFECTO.margenMinimoPct,
          capitalComprometidoMaxPct:
            aNumeroONull(v.capitalComprometidoMaxPct) ?? UMBRALES_DEFECTO.capitalComprometidoMaxPct,
          desviacionPrecioMercadoPct:
            aNumeroONull(v.desviacionPrecioMercadoPct) ??
            UMBRALES_DEFECTO.desviacionPrecioMercadoPct,
          minObservacionesMercado:
            aNumeroONull(v.minObservacionesMercado) ?? UMBRALES_DEFECTO.minObservacionesMercado,
        },
      });
      this.guardado.set(true);
    } catch {
      // El error queda expuesto por store.error(); no se marca como guardado.
      this.guardado.set(false);
    }
  }

  async restaurar(): Promise<void> {
    this.form.setValue({
      capitalDisponible: null,
      moneda: 'ARS',
      margenMinimoPct: UMBRALES_DEFECTO.margenMinimoPct,
      capitalComprometidoMaxPct: UMBRALES_DEFECTO.capitalComprometidoMaxPct,
      desviacionPrecioMercadoPct: UMBRALES_DEFECTO.desviacionPrecioMercadoPct,
      minObservacionesMercado: UMBRALES_DEFECTO.minObservacionesMercado,
    });
    await this.guardar();
  }

  async borrarTodo(): Promise<void> {
    this.borrando.set(true);
    this.mensajeBorrado.set(null);
    try {
      const almacen = globalThis.localStorage ?? null;
      if (almacen) {
        almacen.removeItem(CLAVE_PRODUCTOS_LOCALES);
        almacen.removeItem(CLAVE_PROVEEDORES_LOCALES);
      }
      await this.productoStore.cargar();
      await this.proveedorStore.cargar();
      this.confirmandoBorrado.set(false);
      this.mensajeBorrado.set('Se borraron todos los productos y proveedores.');
    } catch {
      this.mensajeBorrado.set('No se pudo borrar todo. Probá de nuevo.');
    } finally {
      this.borrando.set(false);
    }
  }
}
