import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfiguracionStore } from '../../data/configuracion-store.service';
import { ProductoStore } from '../../data/producto-store.service';
import { analizarProducto } from '../../domain/analysis/analisis-producto';
import { ItemDashboard, resumirDashboard } from '../../domain/analysis/resumen-dashboard';
import { EstadoVacioComponent } from '../../shared/components/estado-vacio.component';
import { VeredictoChipComponent } from '../../shared/components/veredicto-chip.component';
import { GraficoPastelComponent, SlicePastel } from '../../shared/components/grafico-pastel.component';
import { CargaRapidaComponent } from './carga-rapida.component';
import { Veredicto, veredictoDe } from '../../shared/veredicto';
import { FechaPipe, ImportePipe } from '../../shared/pipes/formato.pipe';

interface FilaResumen {
  id: string;
  nombre: string;
  veredicto: Veredicto;
  ganancia: number | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, EstadoVacioComponent, VeredictoChipComponent, ImportePipe, FechaPipe, CargaRapidaComponent, GraficoPastelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Inicio</h1>
      <p class="mt-1 text-sm text-slate-600">Mirá si te conviene comprar cada producto antes de hacerlo.</p>
    </div>

    @if (store.errorLectura()) {
      <div class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {{ store.errorLectura() }}
      </div>
    }

    <a routerLink="/productos/nuevo" class="btn-primary mt-5 w-full py-4 text-base">
      + Analizar un producto
    </a>

    <button type="button" class="btn-secondary mt-3 w-full py-3 text-base" (click)="cargaRapida.abrir()">
      Carga rapida (articulo + proveedor + precio)
    </button>

    <app-carga-rapida #cargaRapida />

    <section class="card mt-5">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold text-slate-900">Tu capital</h2>
        <a routerLink="/configuracion" class="text-sm font-medium text-brand-700">Cambiar</a>
      </div>
      @if (capital() == null) {
        <p class="mt-2 text-sm text-slate-600">
          Sin configurar. Cargá cuánto dinero tenés para saber qué parte de tu dinero usás.
        </p>
      } @else {
        <p class="mt-2 text-2xl font-bold text-slate-900">{{ capital() | importe: moneda() }}</p>
      }
    </section>

    @if (resumen().totalProductos === 0) {
      <div class="mt-5">
        <app-estado-vacio
          [titulo]="'Sin datos todavía'"
          [mensaje]="'Empezá cargando un producto. Son 3 pasos: qué es, cuánto cuesta y a qué precio lo vendés.'"
          [accionTexto]="'Empezar'"
          [accionRuta]="'/productos/nuevo'"
        />
      </div>
    } @else {
      <div class="mt-5 grid grid-cols-2 gap-3">
        <div class="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <p class="text-xs font-medium text-emerald-800">Te conviene</p>
          <p class="mt-1 text-3xl font-bold text-emerald-900">{{ conteos().conviene }}</p>
        </div>
        <div class="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p class="text-xs font-medium text-amber-800">Revisar</p>
          <p class="mt-1 text-3xl font-bold text-amber-900">{{ conteos().revisar }}</p>
        </div>
        <div class="rounded-3xl bg-rose-50 p-4 ring-1 ring-rose-200">
          <p class="text-xs font-medium text-rose-800">No conviene</p>
          <p class="mt-1 text-3xl font-bold text-rose-900">{{ conteos().noConviene }}</p>
        </div>
        <div class="rounded-3xl bg-slate-100 p-4 ring-1 ring-slate-200">
          <p class="text-xs font-medium text-slate-700">Faltan datos</p>
          <p class="mt-1 text-3xl font-bold text-slate-900">{{ conteos().faltan }}</p>
        </div>
      </div>

      <section class="card mt-4">
        <h2 class="text-base font-semibold text-emerald-800">Comprá estos (te conviene)</h2>
        <p class="mt-1 text-xs text-slate-600">Los que ganan dinero y no tienen alertas importantes.</p>
        @if (compra().length === 0) {
          <p class="mt-2 text-sm text-slate-600">Todavía ninguno. Revisá costos o precio de venta.</p>
        } @else {
          <ul class="mt-3 divide-y divide-slate-100">
            @for (fila of compra(); track fila.id) {
              <li class="flex items-center justify-between gap-3 py-3">
                <a [routerLink]="['/productos', fila.id]" class="min-w-0 truncate font-medium text-slate-900">
                  {{ fila.nombre || 'Sin nombre' }}
                </a>
                <div class="flex shrink-0 items-center gap-2">
                  <span class="text-sm font-semibold text-emerald-700">{{ fila.ganancia | importe: moneda() }}</span>
                  <app-veredicto-chip [veredicto]="fila.veredicto" />
                </div>
              </li>
            }
          </ul>
        }
      </section>

      <section class="card mt-4">
        <h2 class="text-base font-semibold text-rose-800">Evitá estos (no conviene)</h2>
        <p class="mt-1 text-xs text-slate-600">Con estos números ganás poco o perdés.</p>
        @if (evitar().length === 0) {
          <p class="mt-2 text-sm text-slate-600">Ninguno por ahora. Buen trabajo.</p>
        } @else {
          <ul class="mt-3 divide-y divide-slate-100">
            @for (fila of evitar(); track fila.id) {
              <li class="flex items-center justify-between gap-3 py-3">
                <a [routerLink]="['/productos', fila.id]" class="min-w-0 truncate font-medium text-slate-900">
                  {{ fila.nombre || 'Sin nombre' }}
                </a>
                <div class="flex shrink-0 items-center gap-2">
                  <span class="text-sm font-semibold text-rose-700">{{ fila.ganancia | importe: moneda() }}</span>
                  <app-veredicto-chip [veredicto]="fila.veredicto" />
                </div>
              </li>
            }
          </ul>
        }
      </section>

      @if (incompletos().length > 0) {
        <section class="card mt-4 border border-amber-500/40">
          <h2 class="text-base font-semibold text-amber-700">Para completar despues</h2>
          <p class="mt-1 text-xs text-slate-600">Te falta precio de venta o costos. Completalos cuando tengas tiempo.</p>
          <ul class="mt-3 divide-y divide-slate-100">
            @for (fila of incompletos(); track fila.id) {
              <li class="flex items-center justify-between gap-3 py-3">
                <a [routerLink]="['/productos', fila.id, 'editar']" class="min-w-0 truncate font-medium text-slate-900">
                  {{ fila.nombre || 'Sin nombre' }}
                </a>
                <a [routerLink]="['/productos', fila.id, 'editar']" class="text-sm font-medium text-brand-700">Completar</a>
              </li>
            }
          </ul>
        </section>
      }

      <section class="card mt-4">
        <h2 class="text-base font-semibold text-slate-900">Top 10 por ganancia potencial</h2>
        <p class="mt-1 text-xs text-slate-600">Los articulos que mas ganancia dejan (relacion precio/ganancia).</p>
        <div class="mt-3">
          <app-grafico-pastel [slices]="slicesGanancia()" [titulo]="'Top 10 ganancia'" [moneda]="moneda()" />
        </div>
      </section>

      <section class="card mt-4">
        <h2 class="text-base font-semibold text-slate-900">�ltimos cambios</h2>
        <ul class="mt-3 divide-y divide-slate-100">
          @for (item of resumen().actividadReciente; track item.id) {
            <li class="flex items-center justify-between gap-3 py-3">
              <div class="min-w-0">
                <a [routerLink]="['/productos', item.id]" class="block truncate font-medium text-slate-900">
                  {{ item.nombre || 'Sin nombre' }}
                </a>
                <p class="text-xs text-slate-500">{{ item.actualizadoEn | fecha }}</p>
              </div>
              <app-veredicto-chip [veredicto]="veredictoPorId(item.id)" />
            </li>
          }
        </ul>
      </section>
    }

    <p class="mt-6 text-xs text-slate-500">
      Los datos se guardan en este navegador. Los precios de otros lugares los cargás vos.
    </p>
  `,
})
export class DashboardComponent {
  readonly store = inject(ProductoStore);
  private readonly config = inject(ConfiguracionStore);

  readonly moneda = computed(() => this.config.configuracion().moneda);
  readonly capital = computed(() => this.config.configuracion().capitalDisponible);

  private readonly items = computed<ItemDashboard[]>(() => {
    const cfg = this.config.configuracion();
    return this.store.productos().map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      actualizadoEn: producto.actualizadoEn,
      analisis: analizarProducto(producto, cfg.umbrales, cfg.capitalDisponible),
    }));
  });

  readonly resumen = computed(() => resumirDashboard(this.items()));

  private readonly filas = computed<FilaResumen[]>(() =>
    this.items().map((i) => ({
      id: i.id,
      nombre: i.nombre,
      veredicto: veredictoDe(i.analisis),
      ganancia: i.analisis.resultado?.gananciaPotencialTotal ?? null,
    })),
  );

  /** Cuenta por veredicto (presentación; las cifras vienen del dominio). */
  readonly conteos = computed(() => {
    const c = { conviene: 0, revisar: 0, noConviene: 0, faltan: 0 };
    for (const f of this.filas()) {
      if (f.veredicto === 'conviene') c.conviene++;
      else if (f.veredicto === 'revisar') c.revisar++;
      else if (f.veredicto === 'no_conviene') c.noConviene++;
      else c.faltan++;
    }
    return c;
  });

  /** Los cinco con mayor ganancia total entre los calculables. */
  readonly mejores = computed(() =>
    this.filas()
      .filter((f) => f.ganancia != null)
      .sort((a, b) => (b.ganancia ?? 0) - (a.ganancia ?? 0))
      .slice(0, 5),
  );

  /** Los que conviene comprar (veredicto conviene), por mayor ganancia. */
  readonly compra = computed(() =>
    this.filas()
      .filter((f) => f.veredicto === 'conviene' && f.ganancia != null)
      .sort((a, b) => (b.ganancia ?? 0) - (a.ganancia ?? 0))
      .slice(0, 5),
  );

  /** Los que no conviene comprar. */
  readonly evitar = computed(() =>
    this.filas().filter((f) => f.veredicto === 'no_conviene'),
  );

  readonly top10Ganancia = computed(() =>
    this.filas()
      .filter((f) => (f.ganancia ?? 0) > 0)
      .sort((a, b) => (b.ganancia ?? 0) - (a.ganancia ?? 0))
      .slice(0, 10),
  );

  private readonly coloresPastel = ['#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#67e8f9', '#6ee7b7', '#fcd34d', '#fda4af'];

  readonly slicesGanancia = computed<SlicePastel[]>(() =>
    this.top10Ganancia().map((f, i) => ({
      id: f.id,
      etiqueta: f.nombre || 'Sin nombre',
      valor: f.ganancia ?? 0,
      color: this.coloresPastel[i % this.coloresPastel.length],
    })),
  );

  readonly incompletos = computed(() =>
    this.filas().filter((f) => f.veredicto === 'faltan_datos'),
  );

  veredictoPorId(id: string): Veredicto {
    return this.filas().find((f) => f.id === id)?.veredicto ?? 'faltan_datos';
  }

  constructor() {
    this.config.cargar();
    void this.store.cargar();
  }
}
