import { Inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import { ProveedorCatalogo, ProveedorCatalogoNuevo } from '../core/models/proveedor.model';
import { ProveedorRepositorioLocal } from './adapters/proveedor-repositorio-local';
import { AlmacenamientoLocal } from './adapters/producto-repositorio-local';
import { ProveedorRepositorio } from './ports/proveedor-repositorio';
import { mensajeDeError } from './producto-store.service';

/**
 * Permite sustituir el repositorio local por una API futura (NestJS)
 * sin modificar los componentes.
 */
export const PROVEEDOR_REPOSITORIO = new InjectionToken<ProveedorRepositorio>('PROVEEDOR_REPOSITORIO');

function repositorioPorDefecto(): ProveedorRepositorio {
  let almacen: AlmacenamientoLocal | null = null;
  try {
    almacen = globalThis.localStorage ?? null;
  } catch {
    almacen = null;
  }
  return new ProveedorRepositorioLocal(almacen);
}

/**
 * Estado reactivo del catálogo de proveedores.
 * ALMACENAMIENTO LOCAL Y TEMPORAL (navegador): no es una sincronización
 * remota ni un respaldo seguro de los datos.
 */
@Injectable({ providedIn: 'root' })
export class ProveedorCatalogoStore {
  private readonly repositorio: ProveedorRepositorio;
  private readonly _proveedores = signal<ProveedorCatalogo[]>([]);

  readonly proveedores = this._proveedores.asReadonly();
  readonly cargando = signal(false);
  readonly errorLectura = signal<string | null>(null);
  readonly errorEscritura = signal<string | null>(null);

  constructor(
    @Optional() @Inject(PROVEEDOR_REPOSITORIO) repositorio: ProveedorRepositorio | null,
  ) {
    this.repositorio = repositorio ?? repositorioPorDefecto();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorLectura.set(null);
    try {
      const lista = await this.repositorio.listar();
      this._proveedores.set(ordenarPorNombre(lista));
    } catch (e) {
      this.errorLectura.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  proveedorPorId(id: string): ProveedorCatalogo | undefined {
    return this._proveedores().find((p) => p.id === id);
  }

  async crear(datos: ProveedorCatalogoNuevo): Promise<ProveedorCatalogo> {
    this.errorEscritura.set(null);
    try {
      const proveedor = await this.repositorio.crear(datos);
      this._proveedores.set(ordenarPorNombre([...this._proveedores(), proveedor]));
      return proveedor;
    } catch (e) {
      this.errorEscritura.set(mensajeDeError(e));
      throw e;
    }
  }

  async actualizar(id: string, cambios: Partial<ProveedorCatalogoNuevo>): Promise<ProveedorCatalogo> {
    this.errorEscritura.set(null);
    try {
      const actualizado = await this.repositorio.actualizar(id, cambios);
      this._proveedores.set(
        ordenarPorNombre(this._proveedores().map((p) => (p.id === id ? actualizado : p))),
      );
      return actualizado;
    } catch (e) {
      this.errorEscritura.set(mensajeDeError(e));
      throw e;
    }
  }

  async fusionar(idBase: string, idOtro: string): Promise<void> {
    if (idBase === idOtro) return;
    const base = this._proveedores().find((p) => p.id === idBase);
    const otro = this._proveedores().find((p) => p.id === idOtro);
    if (!base || !otro) return;
    const fusionado: ProveedorCatalogo = {
      ...base,
      telefono: base.telefono ?? otro.telefono,
      email: base.email ?? otro.email,
      web: base.web ?? otro.web,
      direccion: base.direccion ?? otro.direccion,
      notas: base.notas ?? otro.notas,
      actualizadoEn: otro.actualizadoEn > base.actualizadoEn ? otro.actualizadoEn : base.actualizadoEn,
    };
    await this.actualizar(idBase, {
      nombre: fusionado.nombre,
      telefono: fusionado.telefono ?? '',
      email: fusionado.email ?? '',
      web: fusionado.web ?? '',
      direccion: fusionado.direccion ?? '',
      notas: fusionado.notas ?? '',
    });
    await this.eliminar(idOtro);
    await this.cargar();
  }

  async eliminar(id: string): Promise<void> {
    this.errorEscritura.set(null);
    try {
      await this.repositorio.eliminar(id);
      this._proveedores.set(this._proveedores().filter((p) => p.id !== id));
    } catch (e) {
      this.errorEscritura.set(mensajeDeError(e));
      throw e;
    }
  }

  limpiarErrorEscritura(): void {
    this.errorEscritura.set(null);
  }
}

/** Ordena alfabéticamente sin alterar los datos guardados. */
function ordenarPorNombre(lista: ProveedorCatalogo[]): ProveedorCatalogo[] {
  return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
