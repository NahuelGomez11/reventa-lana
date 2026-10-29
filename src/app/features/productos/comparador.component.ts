import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto } from '../../core/models/producto.model';
import { ConfiguracionStore } from '../../data/configuracion-store.service';
import { ProductoStore } from '../../data/producto-store.service';
import { AnalisisProducto, analizarProducto } from '../../domain/analysis/analisis-producto';
import { VeredictoChipComponent } from '../../shared/components/veredicto-chip.component';
import { ImportePipe } from '../../shared/pipes/formato.pipe';
import { Veredicto, veredictoDe } from '../../shared/veredicto';

interface FilaComparacion {
  producto: Producto;
  analisis: AnalisisProducto;
  veredicto: Veredicto;
  costoTotal: number;
  gananciaTotal: number;
}

interface GrupoComparacion {
  clave: string;
  categoria: string;
  gama: 'baja' | 'media' | 'alta' | null;
  filas: FilaComparacion[];
}

@Component({
  selector: 'app-comparador',
  standalone: true,
  imports: [RouterLink, VeredictoChipComponent, ImportePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Comparar artículos similares</h1>
        <p class="mt-1 text-sm text-slate-600">
          Agrupados automáticamente por categoría y gama. Ranking por costo de compra y por ganancia.
        </p>
      </div>
      <a routerLink="/productos" class="btn-secondary">Volver a productos</a>
    </div>

    @if (store.cargando()) {
      <p class="mt-6 text-sm text-slate-500">Cargando productos…</p>
    } @else if (grupos().length === 0) {
      <div class="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">
        No hay suficientes productos con la misma categoría y gama para comparar.
        Asigná categoría y gama al crear o editar un producto.
      </div>
    } @else {
      @for (g of grupos(); track g.clave) {
        <section class="mt-6">
          <h2 class="text-lg font-semibold text-slate-900">
            {{ g.categoria || 'Sin categoría' }}
            @if (g.gama) {
              <span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                Gama {{ g.gama }}
              </span>
            }
          </h2>
          <p class="text-xs text-slate-500">{{ g.filas.length }} artículos</p>

          <div class="card mt-3 overflow-x-auto p-0">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th class="px-4 py-3 font-medium">Artículo</th>
                  <th class="px-4 py-3 font-medium">Veredicto</th>
                  <th class="px-4 py-3 text-right font-medium">Costo total</th>
                  <th class="px-4 py-3 text-right font-medium">Ganancia total</th>
                  <th class="px-4 py-3 font-medium">Recomendación</th>
                </tr>
              </thead>
              <tbody>
                @for (f of g.filas; track f.producto.id) {
                  <tr class="border-t border-slate-100">
                    <td class="px-4 py-3">
                      <a [routerLink]="['/productos', f.producto.id]" class="font-semibold text-brand-700 hover:underline">
                        {{ f.producto.nombre || 'Sin nombre' }}
                      </a>
                      @if (f.producto.marca) {
                        <div class="text-xs text-slate-500">{{ f.producto.marca }} {{ f.producto.modelo }}</div>
                      }
                    </td>
                    <td class="px-4 py-3"><app-veredicto-chip [veredicto]="f.veredicto" /></td>
                    <td class="px-4 py-3 text-right">
                      {{ f.costoTotal | importe: moneda() }}
                      @if (f.producto.id === mejorCosto(g)) {
                        <span class="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">menor costo</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-right font-semibold">
                      {{ f.gananciaTotal | importe: moneda() }}
                      @if (f.producto.id === mejorGanancia(g)) {
                        <span class="ml-1 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">mayor ganancia</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-600">
                      @if (f.producto.id === mejorCosto(g) && f.producto.id === mejorGanancia(g)) {
                        Recomendado (costo y ganancia)
                      } @else if (f.producto.id === mejorCosto(g)) {
                        Mejor costo de compra
                      } @else if (f.producto.id === mejorGanancia(g)) {
                        Mayor ganancia potencial
                      } @else {
                        —
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    }
  `,
})
export class ComparadorComponent {
  readonly store = inject(ProductoStore);
  private readonly config = inject(ConfiguracionStore);

  readonly moneda = computed(() => this.config.configuracion().moneda);

  readonly grupos = computed<GrupoComparacion[]>(() => {
    const cfg = this.config.configuracion();
    const productos = this.store.productos();
    const filas: FilaComparacion[] = productos.map((p) => {
      const analisis = analizarProducto(p, cfg.umbrales, cfg.capitalDisponible);
      return {
        producto: p,
        analisis,
        veredicto: veredictoDe(analisis),
        costoTotal: analisis.resultado?.inversionTotal ?? 0,
        gananciaTotal: analisis.resultado?.gananciaPotencialTotal ?? 0,
      };
    });

    const gruposMap = new Map<string, GrupoComparacion>();
    for (const f of filas) {
      const categoria = (f.producto.categoria ?? '').trim() || 'Sin categoría';
      const gama = f.producto.gama ?? null;
      const clave = `${categoria}||${gama ?? ''}`;
      let g = gruposMap.get(clave);
      if (!g) {
        g = { clave, categoria, gama, filas: [] };
        gruposMap.set(clave, g);
      }
      g.filas.push(f);
    }

    const resultado: GrupoComparacion[] = [];
    for (const g of gruposMap.values()) {
      if (g.filas.length < 2) continue;
      g.filas.sort((a, b) => a.costoTotal - b.costoTotal);
      resultado.push(g);
    }
    resultado.sort((a, b) => a.categoria.localeCompare(b.categoria));
    return resultado;
  });

  mejorCosto(g: GrupoComparacion): string | null {
    if (g.filas.length === 0) return null;
    return g.filas.reduce((acc, f) => (f.costoTotal < acc.costoTotal ? f : acc), g.filas[0]).producto.id;
  }

  mejorGanancia(g: GrupoComparacion): string | null {
    if (g.filas.length === 0) return null;
    return g.filas.reduce((acc, f) => (f.gananciaTotal > acc.gananciaTotal ? f : acc), g.filas[0]).producto.id;
  }

  constructor() {
    this.config.cargar();
    void this.store.cargar();
  }
}
