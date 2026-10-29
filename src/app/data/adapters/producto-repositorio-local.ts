import { nuevoId } from '../../core/utils/id';
import { Producto, ProductoNuevo } from '../../core/models/producto.model';
import { ErrorRepositorio, ProductoRepositorio } from '../ports/producto-repositorio';

/** Abstracción mínima sobre Web Storage para poder probar el adaptador. */
export interface AlmacenamientoLocal {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

export const CLAVE_PRODUCTOS_LOCALES = 'reventa.intelligence.productos.v1';

function esRegistro(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Objeto no nulo que no sea un arreglo (para campos que deben ser objetos). */
function esObjetoPlano(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Comprueba que un registro almacenado tenga la forma mínima esperada.
 * Evita que datos locales incompatibles (de una versión anterior o editados
 * a mano) rompan la interfaz al analizarlos. No valida reglas de negocio.
 *
 * Se valida también la forma de los elementos de los arreglos: el análisis
 * accede a `observaciones[].precio` y a los campos de `proveedores[]`, por lo
 * que un elemento nulo o no-objeto rompería el rendimiento del detalle/dashboard.
 */
function esProductoValido(v: unknown): v is Producto {
  if (!esRegistro(v)) return false;
  if (typeof v['id'] !== 'string' || typeof v['nombre'] !== 'string') return false;
  if (typeof v['actualizadoEn'] !== 'string') return false;
  if (!esRegistro(v['datos'])) return false;
  if (!esRegistro(v['datos']['costosCompra'])) return false;
  if (!esRegistro(v['datos']['costosVenta'])) return false;
  if (!Array.isArray(v['proveedores']) || !v['proveedores'].every(esObjetoPlano)) return false;
  if (!Array.isArray(v['observaciones']) || !v['observaciones'].every(esObjetoPlano)) return false;
  if (!Array.isArray(v['simulacionPrecios'])) return false;
  if (!v['simulacionPrecios'].every((p) => typeof p === 'number' && Number.isFinite(p))) {
    return false;
  }
  return true;
}

/**
 * ADAPTADOR DE DEMOSTRACIÓN / LOCAL Y TEMPORAL.
 * Guarda los análisis en el almacenamiento del navegador (localStorage).
 * No es una sincronización remota ni un respaldo seguro: los datos viven
 * solo en este equipo y este navegador.
 */
export class ProductoRepositorioLocal implements ProductoRepositorio {
  constructor(private readonly almacen: AlmacenamientoLocal | null) {}

  private exigirEscritura(): AlmacenamientoLocal {
    if (!this.almacen) {
      throw new ErrorRepositorio(
        'escritura',
        'Almacenamiento local no disponible en este navegador.',
      );
    }
    return this.almacen;
  }

  private leer(): Producto[] {
    if (!this.almacen) {
      throw new ErrorRepositorio(
        'lectura',
        'Almacenamiento local no disponible en este navegador.',
      );
    }
    let crudo: string | null;
    try {
      crudo = this.almacen.getItem(CLAVE_PRODUCTOS_LOCALES);
    } catch (e) {
      throw new ErrorRepositorio('lectura', 'No se pudo acceder al almacenamiento local.', e);
    }
    if (crudo == null) return [];
    let parseado: unknown;
    try {
      parseado = JSON.parse(crudo);
    } catch (e) {
      // No se sobrescribe la información ilegible: se informa el error.
      throw new ErrorRepositorio(
        'lectura',
        'Los datos locales de productos están dañados y no se pudieron leer. No se sobrescribieron.',
        e,
      );
    }
    if (!Array.isArray(parseado)) {
      throw new ErrorRepositorio(
        'lectura',
        'Los datos locales de productos tienen un formato inesperado. No se sobrescribieron.',
      );
    }
    if (!parseado.every(esProductoValido)) {
      // No se filtran ni se borran: se informa para no perder ni ocultar datos.
      throw new ErrorRepositorio(
        'lectura',
        'Algunos datos locales de productos tienen un formato incompatible con esta versión y no se pudieron cargar. No se sobrescribieron.',
      );
    }
    return parseado;
  }

  private escribir(lista: Producto[]): void {
    if (!this.almacen) {
      throw new ErrorRepositorio(
        'escritura',
        'Almacenamiento local no disponible en este navegador.',
      );
    }
    try {
      this.almacen.setItem(CLAVE_PRODUCTOS_LOCALES, JSON.stringify(lista));
    } catch (e) {
      throw new ErrorRepositorio(
        'escritura',
        'No se pudieron guardar los productos locales (almacenamiento lleno o bloqueado).',
        e,
      );
    }
  }

  async listar(): Promise<Producto[]> {
    return this.leer();
  }

  async obtener(id: string): Promise<Producto | null> {
    return this.leer().find((p) => p.id === id) ?? null;
  }

  async crear(datos: ProductoNuevo): Promise<Producto> {
    this.exigirEscritura();
    const lista = this.leer();
    const ahora = new Date().toISOString();
    const producto: Producto = {
      ...datos,
      id: nuevoId('p'),
      fuente: 'usuario',
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    lista.push(producto);
    this.escribir(lista);
    return producto;
  }

  async actualizar(id: string, cambios: Partial<ProductoNuevo>): Promise<Producto> {
    this.exigirEscritura();
    const lista = this.leer();
    const idx = lista.findIndex((p) => p.id === id);
    if (idx < 0) {
      throw new ErrorRepositorio('no_encontrado', `No existe el producto con id ${id}.`);
    }
    const existente = lista[idx];
    const { id: _idIgnorado, fuente: _fuenteIgnorada, creadoEn: _creadoIgnorado, ...cambiosSeguros } =
      cambios as Partial<Producto>;
    const actualizado: Producto = {
      ...existente,
      ...cambiosSeguros,
      id: existente.id,
      fuente: existente.fuente,
      creadoEn: existente.creadoEn,
      actualizadoEn: new Date().toISOString(),
    };
    lista[idx] = actualizado;
    this.escribir(lista);
    return actualizado;
  }

  async eliminar(id: string): Promise<void> {
    this.exigirEscritura();
    const lista = this.leer();
    const restante = lista.filter((p) => p.id !== id);
    if (restante.length === lista.length) {
      throw new ErrorRepositorio('no_encontrado', `No existe el producto con id ${id}.`);
    }
    this.escribir(restante);
  }
}
