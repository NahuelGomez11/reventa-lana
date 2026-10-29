import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Moneda } from '../../core/models/analisis.model';
import { ObservacionMercado, Producto, ProductoNuevo, Proveedor, crearProductoBorrador } from '../../core/models/producto.model';
import { ConfiguracionStore } from '../../data/configuracion-store.service';
import { ProductoStore } from '../../data/producto-store.service';
import { ProveedorCatalogoStore } from '../../data/proveedor-store.service';
import { RecargosStore } from '../../data/recargos-store.service';
import { analizarProducto } from '../../domain/analysis/analisis-producto';
import { descripcionFuenteCompra } from '../../domain/providers/ofertas';
import { EstadoVacioComponent } from '../../shared/components/estado-vacio.component';
import { ListaAlertasComponent } from '../../shared/components/lista-alertas.component';
import { EscalaPreciosComponent } from '../../shared/components/escala-precios.component';
import { construirEscala, fraseVsMercado } from '../../shared/escala-precios';
import { ResumenFinancieroComponent } from '../../shared/components/resumen-financiero.component';
import { VeredictoChipComponent } from '../../shared/components/veredicto-chip.component';
import { ImportePipe, NumeroPipe, PorcentajePipe, FechaPipe } from '../../shared/pipes/formato.pipe';
import { infoVeredicto, veredictoDe } from '../../shared/veredicto';
import { MercadoEditorComponent } from './mercado-editor.component';
import { ProveedoresProductoComponent } from './proveedores-producto.component';
import { SimuladorPreciosComponent } from './simulador-precios.component';

/** Producto vacío solo para calcular un análisis neutro mientras no hay datos. */
const PRODUCTO_VACIO = crearProductoBorrador('');

@Component({
  selector: 'app-detalle-producto',
  standalone: true,
  imports: [
    RouterLink,
    EstadoVacioComponent,
    ResumenFinancieroComponent,
    VeredictoChipComponent,
    ListaAlertasComponent,
    EscalaPreciosComponent,
    ProveedoresProductoComponent,
    MercadoEditorComponent,
    SimuladorPreciosComponent,
    ImportePipe,
    PorcentajePipe,
    FechaPipe,
    NumeroPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!cargado()) {
      <p class="text-sm text-slate-500">Cargando…</p>
    } @else if (!producto()) {
      <app-estado-vacio
        [titulo]="'No se encontró el producto'"
        [mensaje]="'Puede que lo hayas borrado o que el enlace no sea válido.'"
        [accionTexto]="'Ver mis productos'"
        [accionRuta]="'/productos'"
      />
    } @else {
      @if (producto(); as p) {
        <a routerLink="/productos" class="text-sm font-medium text-slate-500">← Mis productos</a>

        <div class="mt-2">
          <h1 class="text-2xl font-bold tracking-tight">{{ p.nombre || 'Sin nombre' }}</h1>
          <p class="mt-1 text-sm text-slate-600">{{ lineaDescriptiva() }}</p>
        </div>

        <!-- Veredicto principal -->
        <section class="mt-4 rounded-3xl p-5 ring-1" [class]="info().bloque">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-medium text-slate-700">¿Te conviene comprarlo?</p>
            <app-veredicto-chip [veredicto]="veredicto()" />
          </div>
          <p class="mt-2 text-xl font-bold" [class]="info().color">{{ info().titulo }}</p>
          <p class="mt-1 text-sm text-slate-700">{{ info().mensaje }}</p>

          <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div class="rounded-2xl bg-white/80 p-3">
              <p class="text-xs text-slate-500">Lo que pagás</p>
              <p class="mt-0.5 font-bold text-slate-900">{{ analisis().resultado?.inversionTotal | importe: moneda() }}</p>
            </div>
            <div class="rounded-2xl bg-white/80 p-3">
              <p class="text-xs text-slate-500">Ganancia por unidad</p>
              <p class="mt-0.5 font-bold text-slate-900">{{ analisis().resultado?.gananciaNetaPorUnidad | importe: moneda() }}</p>
            </div>
            <div class="rounded-2xl bg-white/80 p-3">
              <p class="text-xs text-slate-500">Ganancia total</p>
              <p class="mt-0.5 font-bold text-slate-900">{{ analisis().resultado?.gananciaPotencialTotal | importe: moneda() }}</p>
            </div>
            <div class="rounded-2xl bg-white/80 p-3">
              <p class="text-xs text-slate-500">Ganancia sobre ventas</p>
              <p class="mt-0.5 font-bold text-slate-900">{{ analisis().resultado?.margenNetoSobreVentas | porcentaje }}</p>
            </div>
          </div>
        </section>

        <!-- Tu precio frente al mercado -->
        <section class="card mt-3">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-base font-semibold text-slate-900">Tu precio frente al mercado</h2>
            @if (fraseMercado(); as frase) {
              <p class="text-sm font-medium text-slate-700">{{ frase }}</p>
            }
          </div>
          @if (escala(); as e) {
            <div class="mt-2 px-1">
              <app-escala-precios [escala]="e" [moneda]="moneda()" />
            </div>
          } @else {
            <p class="mt-3 text-sm text-slate-600">
              Cargá tu precio de venta y algunos precios de otros lugares para ver la comparación.
            </p>
          }
        </section>
        <div class="mt-3 flex flex-wrap gap-2">
          <a [routerLink]="['/productos', p.id, 'editar']" class="btn-secondary flex-1 sm:flex-none">Editar datos</a>
          @if (confirmarEliminar()) {
            <button class="btn-danger flex-1 sm:flex-none" (click)="eliminarProducto()">Sí, borrar</button>
            <button class="btn-secondary flex-1 sm:flex-none" (click)="confirmarEliminar.set(false)">No borrar</button>
          } @else {
            <button class="btn-soft-danger flex-1 sm:flex-none" (click)="confirmarEliminar.set(true)">Borrar</button>
          }
        </div>

        @if (store.errorEscritura()) {
          <div class="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <span>{{ store.errorEscritura() }}</span>
            <button class="text-xs font-semibold underline" (click)="store.limpiarErrorEscritura()">Cerrar</button>
          </div>
        }

        <div class="mt-4 grid gap-4 lg:grid-cols-3">
          <div class="grid content-start gap-4 lg:col-span-2">
            <section class="card">
              <app-resumen-financiero
                [resultado]="analisis().resultado"
                [faltantes]="analisis().construccion.faltantes"
                [moneda]="moneda()"
              />
            </section>

            <section class="card">
              <h2 class="text-base font-semibold text-slate-900">Proveedores</h2>
              <p class="mt-1 text-sm text-slate-600">Cargá a quién le comprás y a qué precio. Elegí cuál usar para el cálculo.</p>
              <div class="mt-3">
                <app-proveedores-producto
                  [proveedores]="p.proveedores"
                  [cantidad]="p.datos.cantidad"
                  [otrosCostosAdquisicion]="p.datos.costosCompra.otrosCostosAdquisicion"
                  [moneda]="moneda()"
                  [catalogo]="proveedoresCatalogo()"
                  [ofertaCompraId]="p.ofertaCompraId ?? null"
                  [recargoPct]="recargoPct()"
                  (cambio)="actualizarProveedores($event)"
                />
              </div>
              <p class="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Costo de compra tomado de: <strong>{{ descripcionCompra() }}</strong>
              </p>
              @for (a of analisis().advertenciasCompra; track a) {
                <p class="mt-1 text-xs text-amber-700">{{ a }}</p>
              }
            </section>

            <section class="card">
              <h2 class="text-base font-semibold text-slate-900">Recargo y precio sugerido</h2>
              <p class="mt-1 text-sm text-slate-600">
                Según categoría ({{ p.categoria || 'sin categoría' }}) y gama ({{ p.gama || 'sin gama' }}).
              </p>
              <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                <div>
                  <dt class="text-xs text-slate-500">Costo total de adquisición (por unidad)</dt>
                  <dd class="font-medium">{{ costoTotalUnitario() | importe: moneda() }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Recargo configurado</dt>
                  <dd class="font-medium">
                    @if (recargoPct() != null) {
                      {{ recargoPct() }}%
                    } @else {
                      <span class="text-amber-700">Sin configurar</span>
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Precio de venta sugerido</dt>
                  <dd class="font-semibold text-emerald-700">
                    @if (precioSugerido() != null) {
                      {{ precioSugerido() | importe: moneda() }}
                    } @else {
                      <span class="text-amber-700">Falta configurar el recargo</span>
                    }
                  </dd>
                </div>
              </dl>
              @if (recargoPct() == null) {
                <p class="mt-2 text-xs text-amber-700">
                  Configurá el recargo en Ajustes para calcular el precio de venta sugerido.
                </p>
              }
            </section>

            <section class="card">
              <h2 class="text-base font-semibold text-slate-900">Precio de venta</h2>
              <p class="mt-1 text-sm text-slate-600">Probá distintos precios y mirá cómo cambia la ganancia.</p>
              <div class="mt-3">
                <app-simulador-precios
                  [datos]="p.datos"
                  [mediana]="analisis().estadisticas.mediana"
                  [moneda]="moneda()"
                  [precios]="p.simulacionPrecios"
                  (cambio)="actualizarSimulacion($event)"
                />
              </div>
            </section>

            <section class="card">
              <h2 class="text-base font-semibold text-slate-900">Precios en otros lugares</h2>
              <p class="mt-1 text-sm text-slate-600">Cargá precios reales que veas (nunca el tuyo) para comparar.</p>
              <div class="mt-3">
                <app-mercado-editor
                  [observaciones]="p.observaciones"
                  [moneda]="moneda()"
                  [minimoObservaciones]="umbrales().minObservacionesMercado"
                  (cambio)="actualizarObservaciones($event)"
                />
              </div>
            </section>
          </div>

          <aside class="grid content-start gap-4">
            <section class="card">
              <h2 class="text-base font-semibold text-slate-900">Riesgo y alertas</h2>
              <p class="mt-1 text-xs text-slate-500">Reglas simples con tus umbrales. No predicen ventas.</p>
              <div class="mt-3">
                <app-lista-alertas [alertas]="analisis().alertas" />
              </div>
            </section>

            <section class="card">
              <h2 class="text-base font-semibold text-slate-900">Comparación con el mercado</h2>
              @if (analisis().estadisticas.mediana == null) {
                <p class="mt-2 text-sm text-slate-600">
                  Todavía no cargaste precios de otros lugares.
                </p>
              } @else {
                <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <dt class="text-slate-500">Precio típico en otros lugares</dt>
                  <dd class="text-right font-semibold">{{ analisis().estadisticas.mediana | importe: moneda() }}</dd>
                  <dt class="text-slate-500">Tu precio de venta</dt>
                  <dd class="text-right font-semibold">{{ p.datos.costosVenta.precioVentaObjetivo | importe: moneda() }}</dd>
                  <dt class="text-slate-500">Diferencia</dt>
                  <dd class="text-right font-semibold">{{ analisis().diferenciaVsMedianaPct | porcentaje }}</dd>
                  <dt class="text-slate-500">Precios cargados</dt>
                  <dd class="text-right font-semibold">
                    {{ analisis().estadisticas.cantidad }}
                    @if (!analisis().estadisticas.suficiente) {
                      <span class="text-xs font-normal text-amber-700">(pocos para comparar)</span>
                    }
                  </dd>
                </dl>
              }
            </section>

            <details class="card">
              <summary class="cursor-pointer list-none text-base font-semibold text-slate-900">
                Datos que cargaste
              </summary>
              <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                <div><dt class="text-xs text-slate-500">Cantidad a comprar</dt><dd class="font-medium">{{ p.datos.cantidad | numero }}</dd></div>
                <div><dt class="text-xs text-slate-500">Precio de compra</dt><dd class="font-medium">{{ analisis().datosEfectivos.costosCompra.precioCompraUnitario | importe: moneda() }}</dd></div>
                <div><dt class="text-xs text-slate-500">Envío del proveedor</dt><dd class="font-medium">{{ analisis().datosEfectivos.costosCompra.envioProveedor | importe: moneda() }}</dd></div>
                <div><dt class="text-xs text-slate-500">Otros costos de compra</dt><dd class="font-medium">{{ p.datos.costosCompra.otrosCostosAdquisicion | importe: moneda() }}</dd></div>
                <div><dt class="text-xs text-slate-500">Precio de venta</dt><dd class="font-medium">{{ p.datos.costosVenta.precioVentaObjetivo | importe: moneda() }}</dd></div>
                <div><dt class="text-xs text-slate-500">Envío al cliente</dt><dd class="font-medium">{{ p.datos.costosVenta.envioCliente | importe: moneda() }}</dd></div>
                <div>
                  <dt class="text-xs text-slate-500">Comisión</dt>
                  <dd class="font-medium">
                    @if (p.datos.costosVenta.comisionMonto != null) {
                      {{ p.datos.costosVenta.comisionMonto | importe: moneda() }} por unidad
                    } @else {
                      {{ p.datos.costosVenta.comisionPorcentaje | porcentaje }}
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Impuestos</dt>
                  <dd class="font-medium">
                    @if (p.datos.costosVenta.impuestosMonto != null) {
                      {{ p.datos.costosVenta.impuestosMonto | importe: moneda() }} por unidad
                    } @else {
                      {{ p.datos.costosVenta.impuestosPorcentaje | porcentaje }}
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Publicidad</dt>
                  <dd class="font-medium">
                    @if (p.datos.costosVenta.publicidadPresupuesto != null) {
                      {{ p.datos.costosVenta.publicidadPresupuesto | importe: moneda() }} en total
                    } @else {
                      {{ p.datos.costosVenta.publicidadPorUnidad | importe: moneda() }} por unidad
                    }
                  </dd>
                </div>
                <div><dt class="text-xs text-slate-500">Capital disponible</dt><dd class="font-medium">{{ p.datos.capitalDisponible ?? capitalGlobal() | importe: moneda() }}</dd></div>
                <div><dt class="text-xs text-slate-500">Precio mínimo aceptable</dt><dd class="font-medium">{{ p.precioMinimoAceptable | importe: moneda() }}</dd></div>
                <div><dt class="text-xs text-slate-500">Proveedor principal</dt><dd class="font-medium">{{ nombreProveedorPrincipal(p) }}</dd></div>
              </dl>
              <p class="mt-3 text-xs text-slate-500">Actualizado el {{ p.actualizadoEn | fecha }}.</p>
            </details>
          </aside>
        </div>
      }
    }
  `,
})
export class DetalleProductoComponent {
  readonly store = inject(ProductoStore);
  private readonly config = inject(ConfiguracionStore);
  private readonly catalogo = inject(ProveedorCatalogoStore);
  private readonly recargos = inject(RecargosStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly id = this.route.snapshot.paramMap.get('id');
  readonly cargado = signal(false);
  readonly confirmarEliminar = signal(false);

  readonly proveedoresCatalogo = this.catalogo.proveedores;

  readonly moneda = computed<Moneda>(() => this.config.configuracion().moneda);
  readonly umbrales = computed(() => this.config.configuracion().umbrales);
  readonly capitalGlobal = computed(() => this.config.configuracion().capitalDisponible);

  readonly producto = computed<Producto | null>(() =>
    this.id ? this.store.productoPorId(this.id) ?? null : null,
  );

  readonly analisis = computed(() => {
    const p = this.producto();
    const cfg = this.config.configuracion();
    return analizarProducto(p ?? PRODUCTO_VACIO, cfg.umbrales, cfg.capitalDisponible);
  });

  readonly veredicto = computed(() => veredictoDe(this.analisis()));

  readonly escala = computed(() =>
    construirEscala(this.analisis(), this.producto()?.datos.costosVenta.precioVentaObjetivo ?? null),
  );
  readonly recargoPct = computed<number | null>(() => {
    const p = this.producto();
    if (!p) return null;
    return this.recargos.porcentajePara(p.categoria, p.gama ?? null);
  });
  readonly costoTotalUnitario = computed<number | null>(() => {
    const a = this.analisis();
    return a.resultado?.costoAdquisicionUnitarioEfectivo ?? null;
  });
  readonly precioSugerido = computed<number | null>(() => {
    const costo = this.costoTotalUnitario();
    const r = this.recargoPct();
    if (costo == null || r == null) return null;
    return costo * (1 + r / 100);
  });
  readonly fraseMercado = computed(() => fraseVsMercado(this.analisis().diferenciaVsMedianaPct));
  readonly info = computed(() => infoVeredicto(this.veredicto()));

  constructor() {
    this.config.cargar();
    this.recargos.cargar();
    void this.catalogo.cargar();
    void this.cargar();
  }

  /** Marca, modelo y categoría en una línea (sin campos vacíos). */
  readonly lineaDescriptiva = computed(() => {
    const p = this.producto();
    const partes = [p?.marca, p?.modelo, p?.categoria]
      .map((t) => (t ?? '').trim())
      .filter((t) => t !== '');
    return partes.length > 0 ? partes.join(' · ') : 'Sin marca ni categoría';
  });

  private async cargar(): Promise<void> {
    await this.store.cargar();
    this.cargado.set(true);
  }

  private async persistir(cambios: Partial<ProductoNuevo>): Promise<void> {
    const p = this.producto();
    if (!p) return;
    try {
      await this.store.actualizar(p.id, cambios);
    } catch {
      // El error queda expuesto por store.errorEscritura().
    }
  }

  /** Descripción de la fuente del costo de compra usada en el cálculo. */
  descripcionCompra(): string {
    return descripcionFuenteCompra(this.analisis().fuenteCompra);
  }

  actualizarProveedores(proveedores: Proveedor[]): void {
    const p = this.producto();
    const cambios: Partial<ProductoNuevo> = { proveedores };
    // Si se quita la oferta usada para comprar, el producto vuelve a costos manuales.
    if (p?.ofertaCompraId && !proveedores.some((o) => o.id === p.ofertaCompraId)) {
      cambios.ofertaCompraId = null;
    }
    void this.persistir(cambios);
  }

  /** Nombre del proveedor principal asignado desde el catálogo. */
  nombreProveedorPrincipal(p: Producto): string {
    const id = p.proveedorPrincipalId;
    if (!id) return '—';
    return this.catalogo.proveedorPorId(id)?.nombre ?? 'Proveedor no encontrado';
  }

  actualizarObservaciones(observaciones: ObservacionMercado[]): void {
    void this.persistir({ observaciones });
  }

  actualizarSimulacion(simulacionPrecios: number[]): void {
    void this.persistir({ simulacionPrecios });
  }

  async eliminarProducto(): Promise<void> {
    const p = this.producto();
    if (!p) return;
    try {
      await this.store.eliminar(p.id);
      await this.router.navigate(['/productos']);
    } catch {
      // El error queda expuesto por store.errorEscritura().
    }
  }
}
