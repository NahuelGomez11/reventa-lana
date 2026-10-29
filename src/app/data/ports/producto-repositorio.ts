import { Producto, ProductoNuevo } from '../../core/models/producto.model';

export type CodigoErrorRepositorio = 'lectura' | 'escritura' | 'no_encontrado' | 'desconocido';

/**
 * Error de persistencia con código para que la capa de presentación
 * pueda mostrar un mensaje claro sin conocer el detalle técnico.
 */
export class ErrorRepositorio extends Error {
  constructor(
    public readonly codigo: CodigoErrorRepositorio,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = 'ErrorRepositorio';
  }
}

/**
 * Contrato de persistencia de productos.
 * El MVP lo implementa con almacenamiento local del navegador;
 * una API NestJS podrá sustituirla sin tocar componentes ni dominio.
 */
export interface ProductoRepositorio {
  listar(): Promise<Producto[]>;
  /** Devuelve null cuando el id no existe (no es un error). */
  obtener(id: string): Promise<Producto | null>;
  crear(datos: ProductoNuevo): Promise<Producto>;
  actualizar(id: string, cambios: Partial<ProductoNuevo>): Promise<Producto>;
  /** Lanza ErrorRepositorio('no_encontrado') si el id no existe. */
  eliminar(id: string): Promise<void>;
}
