import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatosAnalisis, Moneda } from '../../core/models/analisis.model';
import {
  ObservacionMercado,
  Producto,
  ProductoNuevo,
  Proveedor,
  crearProductoBorrador,
  crearProductoNuevo,
} from '../../core/models/producto.model';
import { resolverFuenteCompra, ResolucionCompra } from '../../domain/providers/ofertas';
import { ahoraIso, nuevoId } from '../../core/utils/id';
import {
  aNumeroONull,
  enteroPositivo,
  noNegativo,
  porcentajeValido,
  positivoSiPresente,
} from '../../core/forms/validadores';
import { ConfiguracionStore } from '../../data/configuracion-store.service';
import { ProductoStore, mensajeDeError } from '../../data/producto-store.service';
import { ProveedorCatalogoStore } from '../../data/proveedor-store.service';
import { RecargosStore } from '../../data/recargos-store.service';
import { analizarProducto } from '../../domain/analysis/analisis-producto';
import {
  construirAnalisisInput,
} from '../../domain/financial/construir-analisis';
import { precioVentaParaMargen } from '../../domain/financial/financial.service';
import { calcularEstadisticasMercado } from '../../domain/market/market-stats';
import { fusionarObservaciones } from '../../domain/market/observaciones-mercado';
import { clasificarPrecioEnMercado } from '../../domain/market/recomendacion-precio';
import { CampoNumeroComponent } from '../../shared/components/campo-numero.component';
import { CampoTextoComponent } from '../../shared/components/campo-texto.component';
import { SelectorCategoriaComponent } from '../../shared/components/selector-categoria.component';
import { ListaAlertasComponent } from '../../shared/components/lista-alertas.component';
import { ResumenFinancieroComponent } from '../../shared/components/resumen-financiero.component';
import { ImportePipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { BusquedaMercadoComponent } from './busqueda-mercado.component';
import {
  margenSugeridoPara,
  PORCENTAJES_RAPIDOS,
  TIPOS_PRODUCTO,
  tipoProductoPorId,
} from '../../domain/pricing/tipos-producto';

export type ModoMontoPorcentaje = 'porcentaje' | 'monto';
export type ModoPublicidad = 'unidad' | 'presupuesto';
export type ModoPrecio = 'precio' | 'margen';

function crearFormulario(ofertas: () => Proveedor[]) {
  return new FormGroup(
    {
      nombre: new FormControl<string | null>('', [Validators.required]),
      marca: new FormControl<string | null>(''),
      modelo: new FormControl<string | null>(''),
      categoria: new FormControl<string | null>(''),
      gama: new FormControl<string | null>(null),
      caracteristicas: new FormControl<string | null>(''),
      tipoProductoId: new FormControl<string | null>(null),
      proveedorPrincipalId: new FormControl<string | null>(null),
      precioMinimoAceptable: new FormControl<number | null>(null, [noNegativo]),
      modoPrecio: new FormControl<ModoPrecio>('precio', { nonNullable: true }),
      margenObjetivoPct: new FormControl<number | null>(null, [porcentajeValido]),

      cantidad: new FormControl<number | null>(null, [Validators.required, enteroPositivo]),
      capitalDisponible: new FormControl<number | null>(null, [noNegativo]),
      ofertaCompraId: new FormControl<string | null>(null),
      precioCompraUnitario: new FormControl<number | null>(null, [Validators.required, noNegativo]),
      envioProveedor: new FormControl<number | null>(0, [noNegativo]),
      otrosCostosAdquisicion: new FormControl<number | null>(0, [noNegativo]),

      precioVentaObjetivo: new FormControl<number | null>(null, [
        Validators.required,
        positivoSiPresente,
      ]),
      envioCliente: new FormControl<number | null>(0, [noNegativo]),
      otrosCostosVenta: new FormControl<number | null>(0, [noNegativo]),

      modoComision: new FormControl<ModoMontoPorcentaje>('porcentaje', { nonNullable: true }),
      comisionPorcentaje: new FormControl<number | null>(0, [Validators.required, porcentajeValido]),
      comisionMonto: new FormControl<number | null>(null, [noNegativo]),

      modoImpuestos: new FormControl<ModoMontoPorcentaje>('porcentaje', { nonNullable: true }),
      impuestosPorcentaje: new FormControl<number | null>(0, [
        Validators.required,
        porcentajeValido,
      ]),
      impuestosMonto: new FormControl<number | null>(null, [noNegativo]),

      modoPublicidad: new FormControl<ModoPublicidad>('unidad', { nonNullable: true }),
      publicidadPorUnidad: new FormControl<number | null>(0, [Validators.required, noNegativo]),
      publicidadPresupuesto: new FormControl<number | null>(null, [noNegativo]),
    },
    { validators: (control) => validarCalculable(control, ofertas()) },
  );
}

export type ValorFormulario = ReturnType<typeof crearFormulario>['value'];

function textoONull(v: string | null | undefined): string | null {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
}

/** Convierte los valores del formulario en datos del dominio (null = sin completar). */
export function aDatosAnalisis(valor: ValorFormulario): DatosAnalisis {
  const usarMontoComision = valor.modoComision === 'monto';
  const usarMontoImpuestos = valor.modoImpuestos === 'monto';
  const usarPresupuestoPublicidad = valor.modoPublicidad === 'presupuesto';
  return {
    cantidad: aNumeroONull(valor.cantidad),
    capitalDisponible: aNumeroONull(valor.capitalDisponible),
    costosCompra: {
      precioCompraUnitario: aNumeroONull(valor.precioCompraUnitario),
      envioProveedor: aNumeroONull(valor.envioProveedor),
      otrosCostosAdquisicion: aNumeroONull(valor.otrosCostosAdquisicion),
    },
    costosVenta: {
      precioVentaObjetivo: aNumeroONull(valor.precioVentaObjetivo),
      comisionPorcentaje: usarMontoComision ? null : aNumeroONull(valor.comisionPorcentaje),
      comisionMonto: usarMontoComision ? aNumeroONull(valor.comisionMonto) : null,
      envioCliente: aNumeroONull(valor.envioCliente),
      publicidadPorUnidad: usarPresupuestoPublicidad
        ? null
        : aNumeroONull(valor.publicidadPorUnidad),
      publicidadPresupuesto: usarPresupuestoPublicidad
        ? aNumeroONull(valor.publicidadPresupuesto)
        : null,
      impuestosPorcentaje: usarMontoImpuestos ? null : aNumeroONull(valor.impuestosPorcentaje),
      impuestosMonto: usarMontoImpuestos ? aNumeroONull(valor.impuestosMonto) : null,
      otrosCostosVenta: aNumeroONull(valor.otrosCostosVenta),
    },
  };
}

/**
 * Validador a nivel de grupo: reutiliza la misma función de dominio que decide
 * si el análisis es calculable. Un producto no se guarda incompleto.
 */
function validarCalculable(
  control: AbstractControl,
  ofertas: Proveedor[],
): ValidationErrors | null {
  const faltantes = calcularFaltantes(control.value as ValorFormulario, ofertas);
  return faltantes.length > 0 ? { datosFaltantes: faltantes } : null;
}

/**
 * Faltantes para poder calcular el análisis, según el modo de precio elegido.
 * Si el costo de compra viene de una oferta, se usan sus datos en lugar de los manuales.
 */
export function calcularFaltantes(valor: ValorFormulario, ofertas: Proveedor[] = []): string[] {
  const modoPrecio: ModoPrecio = valor.modoPrecio ?? 'precio';
  const compra = resolverFuenteCompra(aDatosAnalisis(valor), ofertas, valor.ofertaCompraId);
  const construccion = construirAnalisisInput(compra.datos, {
    precioVentaOpcional: modoPrecio === 'margen',
  });
  const faltantes = [...construccion.faltantes];
  if (modoPrecio === 'margen') {
    const margen = aNumeroONull(valor.margenObjetivoPct);
    if (margen == null || margen <= 0 || margen >= 100) {
      faltantes.push('Margen deseado (%) entre 0 y 100');
    } else if (construccion.ok && precioVentaParaMargen(construccion.input, margen) == null) {
      faltantes.push('Costos compatibles con el margen deseado');
    }
  }
  return faltantes;
}

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CampoNumeroComponent,
    CampoTextoComponent,
    SelectorCategoriaComponent,
    ResumenFinancieroComponent,
    ListaAlertasComponent,
    ImportePipe,
    PorcentajePipe,
    BusquedaMercadoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrarPicker()' },
  templateUrl: './producto-form.component.html',
})
export class ProductoFormComponent {
  private readonly store = inject(ProductoStore);
  private readonly config = inject(ConfiguracionStore);
  private readonly catalogoStore = inject(ProveedorCatalogoStore);
  private readonly recargosStore = inject(RecargosStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Proveedores del catálogo para asignar como principal. */
  readonly proveedoresCatalogo = this.catalogoStore.proveedores;

  readonly id = this.route.snapshot.paramMap.get('id');
  readonly modoEdicion = this.id != null;

  /** Estado base del producto (ofertas y observaciones no editables en este formulario). Va antes del form: el validador lo lee. */
  private readonly base = signal<Producto>(crearProductoBorrador());

  readonly form = crearFormulario(() => this.base().proveedores);
  readonly enviado = signal(false);
  readonly guardando = signal(false);
  readonly mensaje = signal<string | null>(null);
  readonly noEncontrado = signal(false);
  /** Controla el popup de selección de proveedor principal. */
  readonly pickerAbierto = signal(false);

  /** Precios de otros lugares (referencia) cargados en el formulario. */
  readonly observaciones = computed(() => this.base().observaciones);
  readonly borradorPrecioMercado = signal<number | null>(null);
  readonly errorMercado = signal<string | null>(null);

  private readonly valor = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Ofertas de proveedor del producto, entre las que se puede elegir la fuente de compra. */
  readonly ofertasCompra = computed(() => this.base().proveedores);

  /** Oferta elegida como fuente del costo de compra (null = carga manual). */
  readonly ofertaCompraSeleccionada = computed<Proveedor | null>(() => {
    const id = textoONull(this.valor().ofertaCompraId);
    if (!id) return null;
    return this.base().proveedores.find((o) => o.id === id) ?? null;
  });

  readonly faltantes = computed(() => calcularFaltantes(this.valor(), this.base().proveedores));

  /** Resolución del costo de compra (fuente y advertencias de la oferta elegida). */
  readonly resolucionCompra = computed<ResolucionCompra>(() => {
    const v = this.valor();
    return resolverFuenteCompra(
      aDatosAnalisis(v),
      this.base().proveedores,
      textoONull(v.ofertaCompraId),
      aNumeroONull(v.cantidad),
    );
  });

  /** Proveedor del catálogo actualmente elegido como principal (o null). */
  readonly proveedorPrincipal = computed(() => {
    const id = textoONull(this.valor().proveedorPrincipalId);
    if (!id) return null;
    return this.catalogoStore.proveedores().find((p) => p.id === id) ?? null;
  });

  /** Listado de tipos de producto con margen sugerido. */
  readonly tiposProducto = TIPOS_PRODUCTO;
  readonly porcentajesRapidos = PORCENTAJES_RAPIDOS;

  /** Tipo de producto elegido (null si no se eligió). */
  readonly tipoProducto = computed(() => tipoProductoPorId(this.valor().tipoProductoId));

  /** Margen sugerido por el tipo de producto elegido. */
  readonly margenSugerido = computed(() => margenSugeridoPara(this.valor().tipoProductoId));

  /** Sugerencia de precio de venta según el margen sugerido del tipo. */
  readonly precioSugeridoPorTipo = computed<number | null>(() => {
    const margen = this.margenSugerido();
    if (margen == null) return null;
    const construccion = construirAnalisisInput(aDatosAnalisis(this.valor()), {
      precioVentaOpcional: true,
    });
    if (!construccion.ok) return null;
    return precioVentaParaMargen(construccion.input, margen);
  });

  /** Aplica un margen (en %) como modo de precio y lo deja listo. */
  aplicarMargen(margen: number): void {
    const c = this.form.controls;
    c.modoPrecio.setValue('margen');
    c.margenObjetivoPct.setValue(margen);
    c.margenObjetivoPct.markAsDirty();
    this.aplicarModoPrecio();
  }

  /** Estadísticas del mercado con los precios de otros lugares cargados. */
  readonly estadisticasMercado = computed(() =>
    calcularEstadisticasMercado(
      this.observaciones().map((o) => o.precio),
      this.config.configuracion().umbrales.minObservacionesMercado,
    ),
  );

  /** Mínimo de observaciones para considerar la muestra suficiente. */
  readonly minimoObservacionesMercado = computed(
    () => this.config.configuracion().umbrales.minObservacionesMercado,
  );

  /** Precio que alcanza el margen deseado (solo en modo margen). */
  readonly precioSugeridoPorMargen = computed<number | null>(() => {
    const margen = aNumeroONull(this.valor().margenObjetivoPct);
    if (margen == null) return null;
    const construccion = construirAnalisisInput(aDatosAnalisis(this.valor()), {
      precioVentaOpcional: true,
    });
    if (!construccion.ok) return null;
    return precioVentaParaMargen(construccion.input, margen);
  });

  /** Precio con el que se compara contra el mercado, según el modo elegido. */
  readonly precioComparado = computed<number | null>(() => {
    if (this.valor().modoPrecio === 'margen') return this.precioSugeridoPorMargen();
    return aNumeroONull(this.valor().precioVentaObjetivo);
  });

  /** Ubicación del precio comparado respecto del rango del mercado. */
  readonly ubicacionMercado = computed(() => {
    const precio = this.precioComparado();
    if (precio == null) return null;
    return clasificarPrecioEnMercado(precio, this.estadisticasMercado());
  });

  /** Proyección del formulario como Producto: se analiza con el mismo dominio que el detalle. */
  private readonly productoProyectado = computed<Producto>(() => {
    const v = this.valor();
    const b = this.base();
    return {
      ...b,
      nombre: textoONull(v.nombre) ?? '',
      marca: (v.marca ?? '').trim(),
      modelo: (v.modelo ?? '').trim(),
      categoria: (v.categoria ?? '').trim(),
      gama: (v.gama ?? null) as 'baja' | 'media' | 'alta' | null,
      caracteristicas: (v.caracteristicas ?? '').trim(),
      proveedorPrincipalId: textoONull(v.proveedorPrincipalId),
      ofertaCompraId: textoONull(v.ofertaCompraId),
      precioMinimoAceptable: aNumeroONull(v.precioMinimoAceptable),
      datos: aDatosAnalisis(v),
    };
  });

  readonly analisis = computed(() =>
    analizarProducto(
      this.productoProyectado(),
      this.config.configuracion().umbrales,
      this.config.configuracion().capitalDisponible,
    ),
  );

  readonly moneda = computed<Moneda>(() => this.config.configuracion().moneda);

  readonly recargoPctForm = computed<number | null>(() => {
    const v = this.valor();
    const cat = (v.categoria ?? '').trim();
    const gama = (v.gama ?? null) as 'baja' | 'media' | 'alta' | null;
    if (!cat) return null;
    return this.recargosStore.porcentajePara(cat, gama);
  });

  readonly precioSugeridoForm = computed<number | null>(() => {
    const costo = this.analisis().resultado?.costoAdquisicionUnitarioEfectivo ?? null;
    const r = this.recargoPctForm();
    if (costo == null || r == null) return null;
    return costo * (1 + r / 100);
  });

  readonly titulo = computed(() =>
    this.modoEdicion ? 'Editar análisis de producto' : 'Crear análisis de producto',
  );

  constructor() {
    this.config.cargar();
    this.recargosStore.cargar();
    void this.catalogoStore.cargar();
    this.sincronizarModos();
    this.form.controls.ofertaCompraId.valueChanges.subscribe(() => this.sincronizarCompra());
    this.form.valueChanges.subscribe(() => this.aplicarModoPrecio());

    if (this.modoEdicion) {
      void this.cargarParaEdicion();
    }
  }

  private sincronizarModos(): void {
    const c = this.form.controls;

    const aplicarComision = (modo: ModoMontoPorcentaje) => {
      if (modo === 'porcentaje') {
        c.comisionMonto.setValue(null);
        c.comisionPorcentaje.setValidators([Validators.required, porcentajeValido]);
        c.comisionMonto.setValidators([noNegativo]);
      } else {
        c.comisionPorcentaje.setValue(null);
        c.comisionMonto.setValidators([Validators.required, noNegativo]);
        c.comisionPorcentaje.setValidators([porcentajeValido]);
      }
      c.comisionPorcentaje.updateValueAndValidity();
      c.comisionMonto.updateValueAndValidity();
    };

    const aplicarImpuestos = (modo: ModoMontoPorcentaje) => {
      if (modo === 'porcentaje') {
        c.impuestosMonto.setValue(null);
        c.impuestosPorcentaje.setValidators([Validators.required, porcentajeValido]);
        c.impuestosMonto.setValidators([noNegativo]);
      } else {
        c.impuestosPorcentaje.setValue(null);
        c.impuestosMonto.setValidators([Validators.required, noNegativo]);
        c.impuestosPorcentaje.setValidators([porcentajeValido]);
      }
      c.impuestosPorcentaje.updateValueAndValidity();
      c.impuestosMonto.updateValueAndValidity();
    };

    const aplicarPublicidad = (modo: ModoPublicidad) => {
      if (modo === 'unidad') {
        c.publicidadPresupuesto.setValue(null);
        c.publicidadPorUnidad.setValidators([Validators.required, noNegativo]);
        c.publicidadPresupuesto.setValidators([noNegativo]);
      } else {
        c.publicidadPorUnidad.setValue(null);
        c.publicidadPresupuesto.setValidators([Validators.required, noNegativo]);
        c.publicidadPorUnidad.setValidators([noNegativo]);
      }
      c.publicidadPorUnidad.updateValueAndValidity();
      c.publicidadPresupuesto.updateValueAndValidity();
    };

    aplicarComision(c.modoComision.value);
    aplicarImpuestos(c.modoImpuestos.value);
    aplicarPublicidad(c.modoPublicidad.value);

    c.modoComision.valueChanges.subscribe(aplicarComision);
    c.modoImpuestos.valueChanges.subscribe(aplicarImpuestos);
    c.modoPublicidad.valueChanges.subscribe(aplicarPublicidad);
  }

  /**
   * Con una oferta elegida como fuente de compra, el precio y el envío manuales dejan de ser
   * obligatorios (se ignoran). Sin oferta vuelven a ser obligatorios.
   */
  private sincronizarCompra(): void {
    const c = this.form.controls;
    const conOferta = textoONull(c.ofertaCompraId.value) != null;
    c.precioCompraUnitario.setValidators(
      conOferta ? [noNegativo] : [Validators.required, noNegativo],
    );
    c.precioCompraUnitario.updateValueAndValidity();
  }

  private async cargarParaEdicion(): Promise<void> {
    this.noEncontrado.set(false);
    await this.store.cargar();
    const producto = this.id ? this.store.productoPorId(this.id) : undefined;
    if (!producto) {
      this.noEncontrado.set(true);
      return;
    }
    this.base.set(producto);
    this.form.patchValue(this.aFormulario(producto));
    this.sincronizarCompra();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity();
  }

  private aFormulario(p: Producto): Partial<ValorFormulario> {
    const cm = p.datos.costosCompra;
    const cv = p.datos.costosVenta;
    const modoComision: ModoMontoPorcentaje = cv.comisionMonto != null ? 'monto' : 'porcentaje';
    const modoImpuestos: ModoMontoPorcentaje = cv.impuestosMonto != null ? 'monto' : 'porcentaje';
    const modoPublicidad: ModoPublicidad =
      cv.publicidadPresupuesto != null ? 'presupuesto' : 'unidad';
    return {
      nombre: p.nombre,
      marca: p.marca,
      modelo: p.modelo,
      categoria: p.categoria,
      gama: p.gama ?? null,
      tipoProductoId: p.tipoProductoId ?? null,
      caracteristicas: p.caracteristicas,
      proveedorPrincipalId: p.proveedorPrincipalId ?? null,
      precioMinimoAceptable: p.precioMinimoAceptable,
      modoPrecio: 'precio',
      margenObjetivoPct: null,
      cantidad: p.datos.cantidad,
      capitalDisponible: p.datos.capitalDisponible,
      ofertaCompraId: p.ofertaCompraId ?? null,
      precioCompraUnitario: cm.precioCompraUnitario,
      envioProveedor: cm.envioProveedor,
      otrosCostosAdquisicion: cm.otrosCostosAdquisicion,
      precioVentaObjetivo: cv.precioVentaObjetivo,
      envioCliente: cv.envioCliente,
      otrosCostosVenta: cv.otrosCostosVenta,
      modoComision,
      comisionPorcentaje: cv.comisionPorcentaje,
      comisionMonto: cv.comisionMonto,
      modoImpuestos,
      impuestosPorcentaje: cv.impuestosPorcentaje,
      impuestosMonto: cv.impuestosMonto,
      modoPublicidad,
      publicidadPorUnidad: cv.publicidadPorUnidad,
      publicidadPresupuesto: cv.publicidadPresupuesto,
    };
  }

  // Getters de controles para la plantilla.
  get c() {
    return this.form.controls;
  }

  /** Pasos del asistente (orden fijo). */
  readonly pasos = [
    { n: 1, titulo: 'Producto' },
    { n: 2, titulo: 'Costo' },
    { n: 3, titulo: 'Venta' },
    { n: 4, titulo: 'Resultado' },
  ];

  readonly paso = signal(1);

  /** Campos que deben ser válidos para avanzar desde cada paso. */
  private camposDelPaso(n: number): AbstractControl[] {
    const c = this.form.controls;
    if (n === 1) return [c.nombre];
    if (n === 2) {
      const campos: AbstractControl[] = [c.cantidad];
      if (textoONull(c.ofertaCompraId.value) == null) {
        campos.push(c.precioCompraUnitario, c.envioProveedor);
      }
      return campos;
    }
    if (n === 3) {
      return [c.modoPrecio.value === 'margen' ? c.margenObjetivoPct : c.precioVentaObjetivo];
    }
    return [];
  }

  /** Avanza al siguiente paso si los datos del paso actual son válidos. */
  siguiente(): void {
    const actual = this.paso();
    const campos = this.camposDelPaso(actual);
    for (const campo of campos) {
      campo.markAsTouched();
      campo.updateValueAndValidity();
    }
    if (campos.some((campo) => campo.invalid)) {
      this.enviado.set(true);
      this.mensaje.set('Revisá los datos marcados antes de seguir.');
      return;
    }
    this.mensaje.set(null);
    this.paso.set(Math.min(actual + 1, this.pasos.length));
  }

  anterior(): void {
    this.mensaje.set(null);
    this.paso.set(Math.max(this.paso() - 1, 1));
  }

  /** Se puede volver a cualquier paso ya visitado; avanzar exige validar cada paso. */
  irAPaso(n: number): void {
    if (n <= this.paso()) {
      this.mensaje.set(null);
      this.paso.set(n);
      return;
    }
    while (this.paso() < n) {
      const antes = this.paso();
      this.siguiente();
      if (this.paso() === antes) return;
    }
  }

  /** Enter o envío del formulario: solo guarda en el último paso. */
  alEnviar(): void {
    if (this.paso() < this.pasos.length) {
      this.siguiente();
      return;
    }
    void this.guardar();
  }

  abrirPicker(): void {
    this.pickerAbierto.set(true);
  }

  cerrarPicker(): void {
    this.pickerAbierto.set(false);
  }

  /** Asigna (o quita) el proveedor principal del catálogo y cierra el popup. */
  elegirProveedor(id: string | null): void {
    const control = this.form.controls.proveedorPrincipalId;
    control.setValue(id);
    control.markAsDirty();
    this.pickerAbierto.set(false);
  }

  /** En modo margen, completa el precio de venta con el sugerido para ese margen. */
  private aplicarModoPrecio(): void {
    const c = this.form.controls;
    if (c.modoPrecio.value !== 'margen') return;
    const sugerido = this.precioSugeridoPorMargen();
    if (sugerido == null) return;
    const actual = c.precioVentaObjetivo.value;
    if (actual == null || Math.abs(actual - sugerido) > 0.005) {
      c.precioVentaObjetivo.setValue(sugerido);
    }
  }

  aNumero(event: Event): number | null {
    const v = (event.target as HTMLInputElement).value;
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  agregarPrecioMercado(): void {
    const precio = this.borradorPrecioMercado();
    if (precio == null || precio <= 0) {
      this.errorMercado.set('Ingresá un precio de referencia mayor a 0.');
      return;
    }
    const observacion: ObservacionMercado = {
      id: nuevoId('obs'),
      precio,
      vendedor: null,
      url: null,
      marca: null,
      modelo: null,
      caracteristicas: null,
      condicion: 'desconocida',
      accesorios: null,
      garantia: null,
      envio: null,
      fechaConsulta: ahoraIso(),
    };
    this.base.update((b) => ({ ...b, observaciones: [...b.observaciones, observacion] }));
    this.borradorPrecioMercado.set(null);
    this.errorMercado.set(null);
  }

  quitarPrecioMercado(id: string): void {
    this.base.update((b) => ({
      ...b,
      observaciones: b.observaciones.filter((o) => o.id !== id),
    }));
  }

  /** Incorpora observaciones obtenidas de la búsqueda automática, sin duplicar. */
  importarObservacionesMercado(observaciones: ObservacionMercado[]): void {
    this.base.update((b) => ({
      ...b,
      observaciones: fusionarObservaciones(b.observaciones, observaciones),
    }));
  }

  aplicarPrecioSugerido(): void {
    const p = this.precioSugeridoForm();
    if (p == null) return;
    this.form.controls.precioVentaObjetivo.setValue(Math.round(p * 100) / 100);
  }

  async guardar(): Promise<void> {
    this.enviado.set(true);
    this.mensaje.set(null);
    this.aplicarModoPrecio();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mensaje.set('Revisá los datos marcados antes de guardar.');
      return;
    }

    this.guardando.set(true);
    try {
      const valor = this.form.getRawValue();
      const datos = aDatosAnalisis(valor);
      const base = this.base();
      const nuevo: ProductoNuevo = {
        ...crearProductoNuevo(),
        nombre: textoONull(valor.nombre) ?? '',
        marca: (valor.marca ?? '').trim(),
        modelo: (valor.modelo ?? '').trim(),
        categoria: (valor.categoria ?? '').trim(),
        gama: (valor.gama as 'baja' | 'media' | 'alta' | null) ?? null,
        tipoProductoId: textoONull(valor.tipoProductoId),
        caracteristicas: (valor.caracteristicas ?? '').trim(),
        proveedorPrincipal: base.proveedorPrincipal,
        proveedorPrincipalId: textoONull(valor.proveedorPrincipalId),
        ofertaCompraId: textoONull(valor.ofertaCompraId),
        precioMinimoAceptable: aNumeroONull(valor.precioMinimoAceptable),
        datos,
        proveedores: base.proveedores,
        observaciones: base.observaciones,
        simulacionPrecios: base.simulacionPrecios,
      };

      const guardado =
        this.modoEdicion && this.id
          ? await this.store.actualizar(this.id, nuevo)
          : await this.store.crear(nuevo);

      await this.router.navigate(['/productos', guardado.id]);
    } catch (e) {
      this.mensaje.set(mensajeDeError(e) || 'No se pudo guardar el producto.');
    } finally {
      this.guardando.set(false);
    }
  }
}
