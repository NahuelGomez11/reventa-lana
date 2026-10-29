/**
 * Proveedor del catálogo: datos propios del proveedor (identidad y contacto).
 * Los términos comerciales de una compra concreta (precio unitario, envío,
 * stock, compra mínima) son por producto y viven en `Producto.proveedores[]`,
 * no acá: el precio cambia según el producto y la cantidad.
 */
export interface ProveedorCatalogo {
  id: string;
  nombre: string;
  /** Teléfono de contacto. Null = sin dato. */
  telefono: string | null;
  /** Correo electrónico. Null = sin dato. */
  email: string | null;
  /** Sitio o publicación (página web). Null = sin dato. */
  web: string | null;
  /** Dirección física. Null = sin dato. */
  direccion: string | null;
  /** Notas libres del usuario sobre el proveedor. Null = sin dato. */
  notas: string | null;
  creadoEn: string; // ISO
  actualizadoEn: string; // ISO
}

export type ProveedorCatalogoNuevo = Omit<ProveedorCatalogo, 'id' | 'creadoEn' | 'actualizadoEn'>;

/** Proveedor vacío, sin datos inventados. */
export function crearProveedorNuevo(): ProveedorCatalogoNuevo {
  return {
    nombre: '',
    telefono: null,
    email: null,
    web: null,
    direccion: null,
    notas: null,
  };
}
