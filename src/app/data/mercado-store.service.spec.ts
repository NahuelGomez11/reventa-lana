import { TestBed } from '@angular/core/testing';
import { FUENTE_MERCADO, MercadoStore } from './mercado-store.service';
import { FuenteMercado } from '../domain/market/fuente-mercado';
import { PublicacionMercado, ResultadoBusquedaMercado } from '../core/models/mercado.model';

function publicacion(id: string): PublicacionMercado {
  return {
    id,
    fuente: 'mercadolibre',
    itemId: id,
    productId: null,
    titulo: `Producto ${id}`,
    precio: 1000,
    moneda: 'ARS',
    url: `https://x/${id}`,
    vendedor: null,
    condicion: 'nuevo',
    envio: { tipo: 'desconocido', costo: null },
    disponible: true,
    consultadoEn: '2026-10-19T10:00:00.000Z',
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
    publicaciones: [],
    total: 0,
    consultadoEn: '2026-10-19T10:00:00.000Z',
    mensaje: null,
  };
  fallar = false;

  async buscar(): Promise<ResultadoBusquedaMercado> {
    this.llamadas += 1;
    if (this.fallar) throw new Error('boom');
    return this.resultado;
  }

  async obtenerItem(): Promise<ResultadoBusquedaMercado> {
    this.llamadas += 1;
    if (this.fallar) throw new Error('boom');
    return this.resultado;
  }
}

function configurar(fuente: FuenteFalsa): MercadoStore {
  TestBed.configureTestingModule({
    providers: [{ provide: FUENTE_MERCADO, useValue: fuente }],
  });
  return TestBed.inject(MercadoStore);
}

describe('MercadoStore', () => {
  it('expone el estado no configurado y no consulta la fuente', async () => {
    const fuente = new FuenteFalsa();
    fuente.configurada = false;
    const store = configurar(fuente);

    expect(store.configurada).toBe(false);
    await store.buscar({ q: 'x', siteId: 'MLA' });
    expect(store.estado()).toBe('no_configurado');
    expect(fuente.llamadas).toBe(0);
  });

  it('publica el resultado y preselecciona todas las publicaciones', async () => {
    const fuente = new FuenteFalsa();
    fuente.resultado = {
      estado: 'ok',
      fuente: 'mercadolibre',
      publicaciones: [publicacion('a'), publicacion('b')],
      total: 2,
      consultadoEn: '2026-10-19T10:00:00.000Z',
      mensaje: null,
    };
    const store = configurar(fuente);

    await store.buscar({ q: 'x', siteId: 'MLA' });
    expect(store.estado()).toBe('ok');
    expect(store.publicaciones()).toHaveLength(2);
    expect(store.publicacionesSeleccionadas()).toHaveLength(2);
    expect(store.haySeleccion()).toBe(true);
    expect(store.consultadoEn()).toBe('2026-10-19T10:00:00.000Z');
  });

  it('permite alternar y limpiar la selección', async () => {
    const fuente = new FuenteFalsa();
    fuente.resultado = {
      estado: 'ok',
      fuente: 'mercadolibre',
      publicaciones: [publicacion('a'), publicacion('b')],
      total: 2,
      consultadoEn: '2026-10-19T10:00:00.000Z',
      mensaje: null,
    };
    const store = configurar(fuente);
    await store.buscar({ q: 'x', siteId: 'MLA' });

    store.alternarSeleccion('a');
    expect(store.publicacionesSeleccionadas().map((p) => p.id)).toEqual(['b']);
    store.seleccionarTodas();
    expect(store.publicacionesSeleccionadas()).toHaveLength(2);
    store.limpiarSeleccion();
    expect(store.haySeleccion()).toBe(false);
  });

  it('registra un error legible si la fuente falla', async () => {
    const fuente = new FuenteFalsa();
    fuente.fallar = true;
    const store = configurar(fuente);

    await store.buscar({ q: 'x', siteId: 'MLA' });
    expect(store.estado()).toBe('error');
    expect(store.error()).toBeTruthy();
    expect(store.publicaciones()).toHaveLength(0);
  });
});
