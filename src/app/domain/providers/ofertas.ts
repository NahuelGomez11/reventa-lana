import { DatosAnalisis } from '../../core/models/analisis.model';
import { Proveedor, RegistroPrecio } from '../../core/models/producto.model';
import { nuevoId } from '../../core/utils/id';

/** Términos comerciales de una oferta (lo que cambia cuando el proveedor cambia de precio). */
export interface TerminosOferta {
  precioUnitario: number;
  envio: number;
  compraMinima: number;
  stockDisponible: number | null;
  observaciones: string | null;
}

/** Tolerancia para comparar importes decimales (evita igualdad estricta entre decimales). */
const TOLERANCIA = 0.005;

function importesIguales(a: number, b: number): boolean {
  return Math.abs(a - b) < TOLERANCIA;
}

export function terminosDeOferta(o: Proveedor): TerminosOferta {
  return {
    precioUnitario: o.precioUnitario,
    envio: o.envio,
    compraMinima: o.compraMinima,
    stockDisponible: o.stockDisponible,
    observaciones: o.observaciones,
  };
}

/** Devuelve los problemas de los términos (lista vacía = válidos). No inventa valores. */
export function validarTerminosOferta(t: TerminosOferta): string[] {
  const errores: string[] = [];
  if (!Number.isFinite(t.precioUnitario) || t.precioUnitario < 0) {
    errores.push('Precio unitario válido (0 o más)');
  }
  if (!Number.isFinite(t.envio) || t.envio < 0) {
    errores.push('Envío válido (0 o más)');
  }
  if (!Number.isInteger(t.compraMinima) || t.compraMinima < 1) {
    errores.push('Compra mínima: número entero de 1 o más');
  }
  if (t.stockDisponible != null && (!Number.isInteger(t.stockDisponible) || t.stockDisponible < 0)) {
    errores.push('Stock: número entero de 0 o más, o vacío');
  }
  return errores;
}

export function hayCambioDeTerminos(actual: TerminosOferta, nuevo: TerminosOferta): boolean {
  return (
    !importesIguales(actual.precioUnitario, nuevo.precioUnitario) ||
    !importesIguales(actual.envio, nuevo.envio) ||
    actual.compraMinima !== nuevo.compraMinima ||
    actual.stockDisponible !== nuevo.stockDisponible ||
    (actual.observaciones ?? null) !== (nuevo.observaciones ?? null)
  );
}

/**
 * Registra un precio nuevo para una oferta: el precio vigente pasa al historial y los
 * términos nuevos quedan como vigentes. Si nada cambió, devuelve la misma oferta.
 */
export function registrarNuevoPrecio(
  oferta: Proveedor,
  nuevos: TerminosOferta,
  ahoraIso: string,
): Proveedor {
  const actuales = terminosDeOferta(oferta);
  if (!hayCambioDeTerminos(actuales, nuevos)) return oferta;
  const archivado: RegistroPrecio = {
    id: nuevoId('precio'),
    ...actuales,
    vigenteDesde: oferta.fechaActualizacion,
    vigenteHasta: ahoraIso,
  };
  return {
    ...oferta,
    ...nuevos,
    historial: [...(oferta.historial ?? []), archivado],
    fechaActualizacion: ahoraIso,
  };
}

function normalizarNombre(nombre: string): string {
  return nombre.trim().toLocaleLowerCase('es');
}

/**
 * Oferta ya existente para el mismo proveedor en el producto: coincide por id de catálogo
 * o, si falta, por nombre. Evita cargar al mismo proveedor dos veces en un artículo.
 */
export function buscarOfertaDuplicada(
  proveedores: Proveedor[],
  proveedor: { proveedorId?: string | null; nombre: string },
): Proveedor | null {
  const nombre = normalizarNombre(proveedor.nombre);
  return (
    proveedores.find(
      (o) =>
        (proveedor.proveedorId != null && o.proveedorId === proveedor.proveedorId) ||
        normalizarNombre(o.nombre) === nombre,
    ) ?? null
  );
}

export type FuenteCompra =
  | { tipo: 'manual' }
  | { tipo: 'oferta'; ofertaId: string; proveedorNombre: string }
  | { tipo: 'oferta_no_encontrada'; ofertaId: string };

export interface ResolucionCompra {
  /** Datos de análisis con el costo de compra efectivo (precio y envío). */
  datos: DatosAnalisis;
  fuente: FuenteCompra;
  advertencias: string[];
}

/**
 * Decide qué costo de compra usa el análisis. Si el producto eligió una oferta, su precio
 * unitario y envío reemplazan a los manuales (no se suman: no se cuentan dos veces).
 * Otros costos de adquisición siempre vienen de los datos manuales.
 */
export function resolverFuenteCompra(
  datos: DatosAnalisis,
  proveedores: Proveedor[],
  ofertaCompraId: string | null | undefined,
  cantidad: number | null = datos.cantidad,
): ResolucionCompra {
  if (ofertaCompraId == null || ofertaCompraId === '') {
    return { datos, fuente: { tipo: 'manual' }, advertencias: [] };
  }
  const oferta = proveedores.find((o) => o.id === ofertaCompraId);
  if (!oferta) {
    return {
      datos,
      fuente: { tipo: 'oferta_no_encontrada', ofertaId: ofertaCompraId },
      advertencias: [
        'La oferta elegida para la compra ya no existe: se usan los costos de compra manuales.',
      ],
    };
  }
  const advertencias: string[] = [];
  if (cantidad != null && oferta.compraMinima > cantidad) {
    advertencias.push(
      `La oferta de ${oferta.nombre} exige comprar al menos ${oferta.compraMinima} unidades (planeadas: ${cantidad}).`,
    );
  }
  if (cantidad != null && oferta.stockDisponible != null && oferta.stockDisponible < cantidad) {
    advertencias.push(
      `Stock de ${oferta.nombre} insuficiente para la cantidad planeada (disponible: ${oferta.stockDisponible}).`,
    );
  }
  return {
    datos: {
      ...datos,
      costosCompra: {
        ...datos.costosCompra,
        precioCompraUnitario: oferta.precioUnitario,
        envioProveedor: oferta.envio,
      },
    },
    fuente: { tipo: 'oferta', ofertaId: oferta.id, proveedorNombre: oferta.nombre },
    advertencias,
  };
}

/** Texto legible de la fuente del costo de compra (sin cifras: los importes se muestran aparte). */
export function descripcionFuenteCompra(fuente: FuenteCompra): string {
  switch (fuente.tipo) {
    case 'oferta':
      return `Oferta de ${fuente.proveedorNombre}`;
    case 'oferta_no_encontrada':
      return 'Oferta no encontrada (se usan costos manuales)';
    default:
      return 'Carga manual';
  }
}
