import { DatosAnalisis } from './analisis.model';

export type CondicionProducto = 'nuevo' | 'usado' | 'reacondicionado' | 'desconocida';

/**
 * Precio anterior de una oferta. Se archiva cuando se registra un precio nuevo
 * para el mismo proveedor en el mismo producto.
 */
export interface RegistroPrecio {
  id: string;
  precioUnitario: number;
  envio: number;
  compraMinima: number;
  stockDisponible: number | null;
  observaciones: string | null;
  /** Desde cuándo rigió este precio (ISO). */
  vigenteDesde: string;
  /** Hasta cuándo rigió: momento en que se registró el precio siguiente (ISO). */
  vigenteHasta: string;
}

/**
 * Oferta de un proveedor para un producto. Los campos de precio son los VIGENTES.
 * `historial` guarda los precios anteriores (opcional: datos previos no lo tienen).
 */
export interface Proveedor {
  id: string;
  /** Id del proveedor del catálogo, si esta oferta proviene de uno. Opcional: datos previos pueden no tenerlo. */
  proveedorId?: string | null;
  nombre: string;
  url: string | null;
  precioUnitario: number;
  stockDisponible: number | null;
  envio: number;
  compraMinima: number;
  garantia: string | null;
  observaciones: string | null;
  fechaActualizacion: string; // ISO (desde cuA�ndo rige el precio vigente)
  historial?: RegistroPrecio[];
  /** True si el proveedor se cargó rápido (solo nombre) y falta completar datos. */
  incompleto?: boolean;
}

export interface ObservacionMercado {
  id: string;
  precio: number;
  vendedor: string | null;
  url: string | null;
  marca: string | null;
  modelo: string | null;
  caracteristicas: string | null;
  condicion: CondicionProducto;
  accesorios: string | null;
  garantia: string | null;
  envio: string | null;
  fechaConsulta: string; // ISO (fecha de consulta al mercado)
  /** Origen del dato: cargado a mano o traído por una búsqueda automática. Opcional (datos previos = manual). */
  origen?: 'manual' | 'auto';
  /** Id de la fuente externa si vino de una búsqueda automática (ej. 'mercadolibre'). */
  fuente?: string | null;
  /** Id de la publicación en la fuente externa, para deduplicar. */
  refExternaId?: string | null;
}

/**
 * Producto analizado. Solo guarda DATOS DE ENTRADA.
 * Los resultados financieros se recalculan siempre con el motor de dominio.
 */
export interface Producto {
  id: string;
  nombre: string;
  marca: string;
  modelo: string;
  categoria: string;
  /** Gama del artículo: baja, media o alta. Usada para comparar artículos similares. */
  gama?: 'baja' | 'media' | 'alta' | null;
  /** Tipo de producto elegido (para sugerir margen). Opcional. */
  tipoProductoId?: string | null;
  caracteristicas: string;
  proveedorPrincipal: string | null;
  /** Id del proveedor del catálogo asignado como principal. Null = sin asignar. */
  proveedorPrincipalId: string | null;
  precioMinimoAceptable: number | null;
  datos: DatosAnalisis;
  proveedores: Proveedor[];
  /**
   * Id de la oferta (de `proveedores`) cuyo precio y envío se usan como costo de compra.
   * Null o ausente = se usan los costos de compra cargados a mano.
   */
  ofertaCompraId?: string | null;
  observaciones: ObservacionMercado[];
  /** Precios de venta probados en la simulación. Solo precios; los cálculos no se persisten. */
  simulacionPrecios: number[];
  /** Identifica el origen: solo se crean productos del usuario, nunca datos demo mezclados. */
  fuente: 'usuario';
  creadoEn: string; // ISO
  actualizadoEn: string; // ISO
}

export type ProductoNuevo = Omit<Producto, 'id' | 'fuente' | 'creadoEn' | 'actualizadoEn'>;

export function crearProductoNuevo(): ProductoNuevo {
  return {
    nombre: '',
    marca: '',
    modelo: '',
    categoria: '',
    gama: null,
    tipoProductoId: null,
    caracteristicas: '',
    proveedorPrincipal: null,
    proveedorPrincipalId: null,
    precioMinimoAceptable: null,
    datos: {
      cantidad: null,
      capitalDisponible: null,
      costosCompra: {
        precioCompraUnitario: null,
        envioProveedor: null,
        otrosCostosAdquisicion: null,
      },
      costosVenta: {
        precioVentaObjetivo: null,
        comisionPorcentaje: null,
        comisionMonto: null,
        envioCliente: null,
        publicidadPorUnidad: null,
        publicidadPresupuesto: null,
        impuestosPorcentaje: null,
        impuestosMonto: null,
        otrosCostosVenta: null,
      },
    },
    proveedores: [],
    ofertaCompraId: null,
    observaciones: [],
    simulacionPrecios: [],
  };
}

/** Producto vacío completo, sin valores financieros inventados. */
export function crearProductoBorrador(ahoraIso?: string): Producto {
  return {
    ...crearProductoNuevo(),
    id: '',
    fuente: 'usuario',
    creadoEn: ahoraIso ?? new Date().toISOString(),
    actualizadoEn: ahoraIso ?? new Date().toISOString(),
  };
}
