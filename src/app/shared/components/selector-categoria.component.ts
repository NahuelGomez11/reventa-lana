import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CategoriasStore } from '../../data/categorias-store.service';

@Component({
  selector: 'app-selector-categoria',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="block text-sm">
      <span class="font-medium text-slate-800">{{ etiqueta() }}</span>
      <button
        type="button"
        class="mt-1 flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-left text-slate-900 shadow-sm"
        (click)="abrir()"
      >
        <span>{{ valor() || 'Sin categoría' }}</span>
        <span class="text-xs text-slate-500">▾</span>
      </button>
    </div>

    @if (abierto()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center" (click)="cerrar()">
        <div class="w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-slate-900">{{ etiqueta() }}</h3>
            <button type="button" class="text-slate-500 hover:text-slate-900" (click)="cerrar()">✕</button>
          </div>
          <input
            type="text"
            class="input mt-3 w-full"
            placeholder="Buscar categoría..."
            [value]="busqueda()"
            (input)="busqueda.set($any($event.target).value)"
            autofocus
          />

          @if (creando()) {
            <div class="mt-3 flex gap-2">
              <input
                type="text"
                class="input flex-1"
                placeholder="Nombre de la nueva categoría"
                [value]="nueva()"
                (input)="nueva.set($any($event.target).value)"
                (keydown.enter)="confirmarNueva()"
              />
              <button type="button" class="btn-primary" (click)="confirmarNueva()">Agregar</button>
            </div>
          } @else {
            <button type="button" class="btn-secondary mt-3 w-full" (click)="creando.set(true)">
              + Nueva categoría
            </button>
          }

          <ul class="mt-3 max-h-60 overflow-y-auto">
            <li>
              <button
                type="button"
                class="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                [class.font-semibold]="valor() === ''"
                (click)="elegir('')"
              >
                Sin categoría
              </button>
            </li>
            @for (c of filtradas(); track c) {
              <li>
                <button
                  type="button"
                  class="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                  [class.font-semibold]="valor() === c"
                  (click)="elegir(c)"
                >
                  {{ c }}
                </button>
              </li>
            }
            @if (filtradas().length === 0 && busqueda().trim() !== '') {
              <li class="px-3 py-2 text-xs text-slate-500">Sin resultados. Creá una nueva arriba.</li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class SelectorCategoriaComponent {
  readonly store = inject(CategoriasStore);
  readonly etiqueta = input<string>('Categoría');
  readonly valor = input<string>('');
  readonly cambio = output<string>();

  readonly abierto = signal(false);
  readonly busqueda = signal('');
  readonly creando = signal(false);
  readonly nueva = signal('');

  readonly filtradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const cats = this.store.categorias();
    if (q === '') return cats;
    return cats.filter((c) => c.toLowerCase().includes(q));
  });

  constructor() {
    this.store.cargar();
  }

  abrir(): void {
    this.abierto.set(true);
    this.busqueda.set('');
    this.creando.set(false);
    this.nueva.set('');
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  elegir(c: string): void {
    this.cambio.emit(c);
    this.cerrar();
  }

  confirmarNueva(): void {
    const n = this.nueva().trim();
    if (!n) return;
    this.store.agregar(n);
    this.cambio.emit(n);
    this.cerrar();
  }
}
