import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ProveedorCatalogo } from '../../core/models/proveedor.model';
import { ProveedorCatalogoStore } from '../../data/proveedor-store.service';

@Component({
  selector: 'app-selector-proveedor',
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
        <span>{{ nombreSeleccionado() || 'Sin proveedor' }}</span>
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
            placeholder="Buscar proveedor..."
            [value]="busqueda()"
            (input)="busqueda.set($any($event.target).value)"
            autofocus
          />

          <div class="mt-3 flex gap-2">
            <input
              type="text"
              class="input flex-1"
              placeholder="O escribí un nombre nuevo"
              [value]="nuevo()"
              (input)="nuevo.set($any($event.target).value)"
              (keydown.enter)="confirmarNuevo()"
            />
            <button type="button" class="btn-primary" (click)="confirmarNuevo()" [disabled]="nuevo().trim() === ''">
              Usar
            </button>
          </div>

          <ul class="mt-3 max-h-60 overflow-y-auto">
            <li>
              <button
                type="button"
                class="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                [class.font-semibold]="proveedorId() === null && nombreSeleccionado() === ''"
                (click)="elegir(null, '')"
              >
                Sin proveedor
              </button>
            </li>
            @for (p of filtrados(); track p.id) {
              <li>
                <button
                  type="button"
                  class="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                  [class.font-semibold]="proveedorId() === p.id"
                  (click)="elegir(p.id, p.nombre)"
                >
                  {{ p.nombre }}
                </button>
              </li>
            }
            @if (filtrados().length === 0 && busqueda().trim() !== '') {
              <li class="px-3 py-2 text-xs text-slate-500">Sin resultados. Usá el campo de arriba.</li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class SelectorProveedorComponent {
  readonly store = inject(ProveedorCatalogoStore);
  readonly etiqueta = input<string>('Proveedor');
  readonly proveedorId = input<string | null>(null);
  readonly nombre = input<string>('');
  readonly cambio = output<{ id: string | null; nombre: string }>();

  readonly abierto = signal(false);
  readonly busqueda = signal('');
  readonly nuevo = signal('');

  readonly nombreSeleccionado = computed(() => this.nombre());

  readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const list = this.store.proveedores();
    if (q === '') return list;
    return list.filter((p) => p.nombre.toLowerCase().includes(q));
  });

  constructor() {
    void this.store.cargar();
  }

  abrir(): void {
    this.abierto.set(true);
    this.busqueda.set('');
    this.nuevo.set('');
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  elegir(id: string | null, nombre: string): void {
    this.cambio.emit({ id, nombre });
    this.cerrar();
  }

  confirmarNuevo(): void {
    const n = this.nuevo().trim();
    if (!n) return;
    this.cambio.emit({ id: null, nombre: n });
    this.cerrar();
  }
}
