import { ProveedorCatalogo, ProveedorCatalogoNuevo } from '../../core/models/proveedor.model';
import { nuevoId } from '../../core/utils/id';
import { ErrorRepositorio } from '../ports/producto-repositorio';
import { ProveedorRepositorio } from '../ports/proveedor-repositorio';
import { AlmacenamientoLocal } from './producto-repositorio-local';

export const CLAVE_PROVEEDORES_LOCALES = 'reventa.intelligence.proveedores.v1';

/** Comprueba la forma mínima de un proveedor almacenado (no valida reglas de negocio). */
function esProveedorCatalogo(v: unknown): v is ProveedorCatalogo {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r['id'] === 'string' && typeof r['nombre'] === 'string';
}

/**
 * ADAPTADOR DE DEMOSTRACIÓN / LOCAL Y TEMPORAL.
 * Guarda el catálogo de proveedores en el almacenamiento del navegador
 * (localStorage). No es una sincronización remota ni un respaldo seguro.
 */
export class ProveedorRepositorioLocal implements ProveedorRepositorio {
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

  private leer(): ProveedorCatalogo[] {
    if (!this.almacen) {
      throw new ErrorRepositorio(
        'lectura',
        'Almacenamiento local no disponible en este navegador.',
      );
    }
    let crudo: string | null;
    try {
      crudo = this.almacen.getItem(CLAVE_PROVEEDORES_LOCALES);
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
        'Los datos locales de proveedores están dañados y no se pudieron leer. No se sobrescribieron.',
        e,
      );
    }
    if (!Array.isArray(parseado)) {
      throw new ErrorRepositorio(
        'lectura',
        'Los datos locales de proveedores no tienen el formato esperado. No se sobrescribieron.',
      );
    }
    if (!parseado.every(esProveedorCatalogo)) {
      throw new ErrorRepositorio(
        'lectura',
        'Los datos locales de proveedores son incompatibles y no se pudieron leer. No se sobrescribieron.',
      );
    }
    return parseado;
  }

  private escribir(lista: ProveedorCatalogo[]): void {
    const almacen = this.exigirEscritura();
    try {
      almacen.setItem(CLAVE_PROVEEDORES_LOCALES, JSON.stringify(lista));
    } catch (e) {
      throw new ErrorRepositorio('escritura', 'No se pudo guardar el proveedor en el navegador.', e);
    }
  }

  async listar(): Promise<ProveedorCatalogo[]> {
    return this.leer();
  }

  async obtener(id: string): Promise<ProveedorCatalogo | null> {
    return this.leer().find((p) => p.id === id) ?? null;
  }

  async crear(datos: ProveedorCatalogoNuevo): Promise<ProveedorCatalogo> {
    this.exigirEscritura();
    const lista = this.leer();
    const ahora = new Date().toISOString();
    const proveedor: ProveedorCatalogo = {
      ...datos,
      id: nuevoId('prov'),
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    lista.push(proveedor);
    this.escribir(lista);
    return proveedor;
  }

  async actualizar(id: string, cambios: Partial<ProveedorCatalogoNuevo>): Promise<ProveedorCatalogo> {
    this.exigirEscritura();
    const lista = this.leer();
    const idx = lista.findIndex((p) => p.id === id);
    if (idx < 0) {
      throw new ErrorRepositorio('no_encontrado', `No existe el proveedor con id ${id}.`);
    }
    const existente = lista[idx];
    const actualizado: ProveedorCatalogo = {
      ...existente,
      ...cambios,
      id: existente.id,
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
      throw new ErrorRepositorio('no_encontrado', `No existe el proveedor con id ${id}.`);
    }
    this.escribir(restante);
  }
}
