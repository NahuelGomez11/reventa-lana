import { Injectable, signal } from '@angular/core';
import { RECARGOS_DEFECTO } from '../core/models/recargos.model';

export const CLAVE_CATEGORIAS_LOCAL = 'reventa.intelligence.categorias.v1';

@Injectable({ providedIn: 'root' })
export class CategoriasStore {
  private readonly _categorias = signal<string[]>([]);
  readonly categorias = this._categorias.asReadonly();
  readonly error = signal<string | null>(null);

  cargar(): void {
    this.error.set(null);
    try {
      const crudo = globalThis.localStorage?.getItem(CLAVE_CATEGORIAS_LOCAL);
      if (crudo == null) {
        const base = Object.keys(RECARGOS_DEFECTO.categorias).sort();
        this._categorias.set(base);
        return;
      }
      const parseado = JSON.parse(crudo);
      if (Array.isArray(parseado)) {
        const limpias = parseado
          .map((v) => (typeof v === 'string' ? v.trim() : ''))
          .filter((v) => v !== '');
        // fusionar con las categorías por defecto (para que aparezcan las nuevas)
        const fusion = [...new Set([...limpias, ...Object.keys(RECARGOS_DEFECTO.categorias)])];
        this._categorias.set(fusion.sort());
        if (this._categorias().length === 0) {
          this._categorias.set(Object.keys(RECARGOS_DEFECTO.categorias).sort());
        }
        return;
      }
      this._categorias.set(Object.keys(RECARGOS_DEFECTO.categorias).sort());
    } catch {
      this.error.set('No se pudo leer las categorías.');
      this._categorias.set(Object.keys(RECARGOS_DEFECTO.categorias).sort());
    }
  }

  /** Asegura que una categoría exista (la agrega si falta). */
  asegurar(nombre: string): void {
    const n = nombre.trim();
    if (!n) return;
    if (this._categorias().some((c) => c.toLowerCase() === n.toLowerCase())) return;
    this._categorias.set([...this._categorias(), n].sort());
    this.persistir();
  }

  agregar(nombre: string): boolean {
    const n = nombre.trim();
    if (!n) return false;
    if (this._categorias().some((c) => c.toLowerCase() === n.toLowerCase())) return false;
    this._categorias.set([...this._categorias(), n].sort());
    this.persistir();
    return true;
  }

  private persistir(): void {
    try {
      globalThis.localStorage?.setItem(CLAVE_CATEGORIAS_LOCAL, JSON.stringify(this._categorias()));
    } catch {
      // ignore
    }
  }
}
