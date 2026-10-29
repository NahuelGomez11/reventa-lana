import { inject, Inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import { Producto, ProductoNuevo } from '../core/models/producto.model';
import { ProductoRepositorioLocal, AlmacenamientoLocal } from './adapters/producto-repositorio-local';
import { ErrorRepositorio, ProductoRepositorio } from './ports/producto-repositorio';
import { CategoriasStore } from './categorias-store.service';

/**
 * Permite sustituir el repositorio local por una API futura (NestJS)
 * sin modificar los componentes.
 */
export const PRODUCTO_REPOSITORIO = new InjectionToken<ProductoRepositorio>('PRODUCTO_REPOSITORIO');

function repositorioPorDefecto(): ProductoRepositorio {
  let almacen: AlmacenamientoLocal | null = null;
  try {
    almacen = globalThis.localStorage ?? null;
  } catch {
    almacen = null;
  }
  return new ProductoRepositorioLocal(almacen);
}

export function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorRepositorio) return e.message;
  if (e instanceof Error) return `Error inesperado: ${e.message}`;
  return 'Error inesperado de persistencia.';
}

/**
 * Estado reactivo de productos.
 * ALMACENAMIENTO LOCAL Y TEMPORAL (navegador): no es una sincronización
 * remota ni un respaldo seguro de los análisis.
 */
@Injectable({ providedIn: 'root' })
export class ProductoStore {
  private readonly repositorio: ProductoRepositorio;
  private readonly _productos = signal<Producto[]>([]);

  readonly productos = this._productos.asReadonly();
  readonly cargando = signal(false);
  readonly errorLectura = signal<string | null>(null);
  readonly errorEscritura = signal<string | null>(null);

  private readonly categoriasStore = inject(CategoriasStore);

  constructor(
    @Optional() @Inject(PRODUCTO_REPOSITORIO) repositorio: ProductoRepositorio | null,
  ) {
    this.repositorio = repositorio ?? repositorioPorDefecto();
  }

  async cargar(): Promise<void> {
    this.categoriasStore.cargar();
    this.cargando.set(true);
    this.errorLectura.set(null);
    try {
      const lista = await this.repositorio.listar();
      this._productos.set(lista);
      for (const p of lista) {
        if (p.categoria) this.categoriasStore.asegurar(p.categoria);
      }
    } catch (e) {
      this.errorLectura.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  productoPorId(id: string): Producto | undefined {
    return this._productos().find((p) => p.id === id);
  }

  async crear(datos: ProductoNuevo): Promise<Producto> {
    this.errorEscritura.set(null);
    try {
      const producto = await this.repositorio.crear(datos);
      this._productos.set([...this._productos(), producto]);
      return producto;
    } catch (e) {
      const msg = mensajeDeError(e);
      this.errorEscritura.set(msg);
      throw e;
    }
  }

  async actualizar(id: string, cambios: Partial<ProductoNuevo>): Promise<Producto> {
    this.errorEscritura.set(null);
    try {
      const actualizado = await this.repositorio.actualizar(id, cambios);
      this._productos.set(
        this._productos().map((p) => (p.id === id ? actualizado : p)),
      );
      return actualizado;
    } catch (e) {
      this.errorEscritura.set(mensajeDeError(e));
      throw e;
    }
  }

  async fusionar(idBase: string, idOtro: string): Promise<void> {
    if (idBase === idOtro) return;
    const base = this._productos().find((p) => p.id === idBase);
    const otro = this._productos().find((p) => p.id === idOtro);
    if (!base || !otro) return;
    // fusionar proveedores por nombre
    const provMap = new Map<string, any>();
    for (const p of base.proveedores) provMap.set(p.nombre.trim().toLowerCase(), { ...p });
    for (const p of otro.proveedores) {
      const k = p.nombre.trim().toLowerCase();
      if (provMap.has(k)) {
        const ex = provMap.get(k);
        provMap.set(k, {
          ...ex,
          precioUnitario: ex.precioUnitario || p.precioUnitario,
          envio: ex.envio || p.envio,
          stockDisponible: ex.stockDisponible ?? p.stockDisponible,
          compraMinima: ex.compraMinima || p.compraMinima,
          garantia: ex.garantia ?? p.garantia,
          observaciones: ex.observaciones ?? p.observaciones,
          url: ex.url ?? p.url,
          proveedorId: ex.proveedorId ?? p.proveedorId,
          incompleto: ex.incompleto && p.incompleto,
        });
      } else {
        provMap.set(k, { ...p });
      }
    }
    const proveedores = Array.from(provMap.values());
    // fusionar observaciones por id/url+precio
    const obsMap = new Map<string, any>();
    const keyObs = (o: any) => o.id || (o.url + '|' + o.precio);
    for (const o of base.observaciones) obsMap.set(keyObs(o), { ...o });
    for (const o of otro.observaciones) {
      const k = keyObs(o);
      if (!obsMap.has(k)) obsMap.set(k, { ...o });
    }
    const observaciones = Array.from(obsMap.values());
    const simSet = new Set([...base.simulacionPrecios, ...otro.simulacionPrecios]);
    const cambios: Partial<ProductoNuevo> = {
      marca: base.marca || otro.marca,
      modelo: base.modelo || otro.modelo,
      categoria: base.categoria || otro.categoria,
      gama: base.gama ?? otro.gama,
      caracteristicas: base.caracteristicas || otro.caracteristicas,
      proveedorPrincipal: base.proveedorPrincipal ?? otro.proveedorPrincipal,
      proveedorPrincipalId: base.proveedorPrincipalId ?? otro.proveedorPrincipalId,
      precioMinimoAceptable: base.precioMinimoAceptable ?? otro.precioMinimoAceptable,
      proveedores,
      observaciones,
      simulacionPrecios: Array.from(simSet),
      tipoProductoId: base.tipoProductoId ?? otro.tipoProductoId,
      ofertaCompraId: base.ofertaCompraId ?? otro.ofertaCompraId,
    };
    await this.actualizar(idBase, cambios);
    await this.eliminar(idOtro);
    await this.cargar();
  }

  async eliminar(id: string): Promise<void> {
    this.errorEscritura.set(null);
    try {
      await this.repositorio.eliminar(id);
      this._productos.set(this._productos().filter((p) => p.id !== id));
    } catch (e) {
      this.errorEscritura.set(mensajeDeError(e));
      throw e;
    }
  }

  limpiarErrorEscritura(): void {
    this.errorEscritura.set(null);
  }
}
