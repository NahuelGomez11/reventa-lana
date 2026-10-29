import { Proveedor } from '../../core/models/producto.model';

export interface EvaluacionProveedor {
  id: string;
  nombre: string;
  /** Costo efectivo unitario a la cantidad del análisis. Null si no es comparable. */
  costoEfectivoUnitario: number | null;
  comparable: boolean;
  motivos: string[];
}

export interface ComparacionProveedores {
  evaluaciones: EvaluacionProveedor[];
  mejorId: string | null;
  advertencias: string[];
}

/**
 * Costo efectivo unitario de un proveedor para la cantidad indicada.
 * Reparte envío del proveedor y otros costos de adquisición entre las unidades,
 * para no comparar solo el precio publicado.
 */
export function costoEfectivoProveedor(
  proveedor: Pick<Proveedor, 'precioUnitario' | 'envio'>,
  cantidad: number,
  otrosCostosAdquisicion: number,
): number {
  const reparto = cantidad > 0 ? (proveedor.envio + otrosCostosAdquisicion) / cantidad : 0;
  return proveedor.precioUnitario + reparto;
}

/**
 * Compara proveedores del mismo producto a la cantidad planeada de compra.
 * Regla: un proveedor solo es comparable si la cantidad planeada cumple su compra
 * mínima y su stock (cuando se conoce) alcanza. Si no, se informa el motivo.
 */
export function compararProveedores(
  proveedores: Proveedor[],
  cantidad: number | null,
  otrosCostosAdquisicion: number | null,
): ComparacionProveedores {
  const advertencias: string[] = [];

  if (otrosCostosAdquisicion == null && proveedores.length > 0) {
    advertencias.push(
      'Otros costos de adquisición sin completar: el costo efectivo no los incluye.',
    );
  }
  const otros = otrosCostosAdquisicion ?? 0;

  if (cantidad == null || cantidad <= 0) {
    if (proveedores.length > 0) {
      advertencias.push('Cantidad de compra sin completar: no se puede comparar costo efectivo.');
    }
    return {
      evaluaciones: proveedores.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        costoEfectivoUnitario: null,
        comparable: false,
        motivos: ['Cantidad de compra sin completar'],
      })),
      mejorId: null,
      advertencias,
    };
  }

  const minimas = proveedores.map((p) => p.compraMinima);
  if (minimas.length > 1) {
    const min = Math.min(...minimas);
    const max = Math.max(...minimas);
    if (max - min > 0) {
      advertencias.push(
        `Las cantidades mínimas difieren entre proveedores (${min} a ${max} unidades). El costo efectivo se calculó con la cantidad planeada (${cantidad}), lo que puede no reflejar el mínimo de cada proveedor.`,
      );
    }
  }

  const evaluaciones: EvaluacionProveedor[] = proveedores.map((p) => {
    const motivos: string[] = [];
    if (p.precioUnitario < 0 || !Number.isFinite(p.precioUnitario)) {
      motivos.push('Precio unitario inválido');
    }
    if (p.compraMinima > cantidad) {
      motivos.push(`Requiere comprar al menos ${p.compraMinima} unidades`);
    }
    if (p.stockDisponible != null && p.stockDisponible < cantidad) {
      motivos.push(`Stock insuficiente (disponible: ${p.stockDisponible})`);
    }
    const comparable = motivos.length === 0;
    return {
      id: p.id,
      nombre: p.nombre,
      costoEfectivoUnitario: comparable ? costoEfectivoProveedor(p, cantidad, otros) : null,
      comparable,
      motivos,
    };
  });

  const comparables = evaluaciones.filter((e) => e.comparable);
  let mejorId: string | null = null;
  if (comparables.length > 0) {
    mejorId = comparables.reduce((mejor, e) =>
      (e.costoEfectivoUnitario ?? Infinity) < (mejor.costoEfectivoUnitario ?? Infinity) ? e : mejor,
    ).id;
  } else {
    advertencias.push('Ningún proveedor es comparable con la cantidad planeada de compra.');
  }

  return { evaluaciones, mejorId, advertencias };
}
