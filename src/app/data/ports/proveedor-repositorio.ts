import {
  ProveedorCatalogo,
  ProveedorCatalogoNuevo,
} from '../../core/models/proveedor.model';

/**
 * Contrato de persistencia del catálogo de proveedores.
 * El MVP lo implementa con almacenamiento local del navegador;
 * una API NestJS podrá sustituirlo sin tocar componentes ni dominio.
 *
 * Los errores usan `ErrorRepositorio` (definido en el puerto de productos)
 * para que la presentación los trate igual que los de productos.
 */
export interface ProveedorRepositorio {
  listar(): Promise<ProveedorCatalogo[]>;
  /** Devuelve null cuando el id no existe (no es un error). */
  obtener(id: string): Promise<ProveedorCatalogo | null>;
  crear(datos: ProveedorCatalogoNuevo): Promise<ProveedorCatalogo>;
  actualizar(id: string, cambios: Partial<ProveedorCatalogoNuevo>): Promise<ProveedorCatalogo>;
  /** Lanza ErrorRepositorio('no_encontrado') si el id no existe. */
  eliminar(id: string): Promise<void>;
}
