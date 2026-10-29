import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusquedaMercadoComponent } from './busqueda-mercado.component';
import { FUENTE_MERCADO, MercadoStore } from '../../data/mercado-store.service';
import { FuenteMercado } from '../../domain/market/fuente-mercado';
import { ObservacionMercado } from '../../core/models/producto.model';
import { PublicacionMercado, ResultadoBusquedaMercado } from '../../core/models/mercado.model';

function publicacion(parcial: Partial<PublicacionMercado> = {}): PublicacionMercado {
  return {
    id: 'MLA1',
    fuente: 'mercadolibre',
    itemId: 'MLA1',
    productId: null,
    titulo: 'Auriculares X',
    precio: 15000,
    moneda: 'ARS',
    url: 'https://x/MLA1',
    vendedor: null,
    condicion: 'nuevo',
    envio: { tipo: 'gratis', costo: null },
    disponible: true,
    consultadoEn: '2026-10-19T10:00:00.000Z',
    ...parcial,
  };
}

class FuenteFalsa implements FuenteMercado {
  readonly id = 'mercadolibre' as const;
  readonly nombre = 'Mercado Libre';
  configurada = true;
  llamadas = 0;
  resultado: ResultadoBusquedaMercado = {
    estado: 'ok',
    fuente: 'mercadolibre',
    publicaciones: [publicacion()],
    total: 1,
    consultadoEn: '2026-10-19T10:00:00.000Z',
    mensaje: null,
  };

  async buscar(): Promise<ResultadoBusquedaMercado> {
    this.llamadas += 1;
    return this.resultado;
  }

  async obtenerItem(): Promise<ResultadoBusquedaMercado> {
    this.llamadas += 1;
    return this.resultado;
  }
}

describe('BusquedaMercadoComponent', () => {
  let fuente: FuenteFalsa;

  async function montar(): Promise<ComponentFixture<BusquedaMercadoComponent>> {
    TestBed.configureTestingModule({
      providers: [{ provide: FUENTE_MERCADO, useFactory: () => fuente }],
    });
    const fixture = TestBed.createComponent(BusquedaMercadoComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    fuente = new FuenteFalsa();
  });

  it('avisa cuando la fuente no está configurada y no muestra el botón', async () => {
    fuente.configurada = false;
    const fixture = await montar();
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('no está configurada');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('busca, lista publicaciones y permite usarlas', async () => {
    const fixture = await montar();
    fixture.componentInstance.termino.set('auriculares');
    await fixture.componentInstance.buscar();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fuente.llamadas).toBe(1);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Auriculares X');
    expect(texto).toContain('Usar seleccionadas');

    const emitidas: ObservacionMercado[][] = [];
    fixture.componentInstance.usar.subscribe((o) => emitidas.push(o));
    fixture.componentInstance.usarSeleccionadas();
    expect(emitidas).toHaveLength(1);
    expect(emitidas[0][0].precio).toBe(15000);
    expect(emitidas[0][0].origen).toBe('auto');
  });

  it('no busca y avisa si falta el término', async () => {
    const fixture = await montar();
    await fixture.componentInstance.buscar();
    fixture.detectChanges();
    expect(fuente.llamadas).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Escribí el producto');
  });

  it('refleja el estado límite alcanzado', async () => {
    fuente.resultado = {
      estado: 'limite',
      fuente: 'mercadolibre',
      publicaciones: [],
      total: 0,
      consultadoEn: '2026-10-19T10:00:00.000Z',
      mensaje: null,
    };
    const fixture = await montar();
    fixture.componentInstance.termino.set('x');
    await fixture.componentInstance.buscar();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('límite de consultas');
  });

  it('usa el nombre del producto del formulario si no se escribió término', async () => {
    const fixture = await montar();
    fixture.componentRef.setInput('nombre', 'iPhone 13');
    await fixture.whenStable();
    await fixture.componentInstance.buscar();
    expect(fuente.llamadas).toBe(1);
  });
});
