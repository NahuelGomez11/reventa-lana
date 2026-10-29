import { TestBed } from '@angular/core/testing';
import {
  CLAVE_CONFIGURACION_LOCAL,
  ConfiguracionStore,
} from './configuracion-store.service';
import { CONFIGURACION_DEFECTO, Configuracion } from '../core/models/configuracion.model';

describe('ConfiguracionStore', () => {
  beforeEach(() => {
    localStorage.removeItem(CLAVE_CONFIGURACION_LOCAL);
    TestBed.configureTestingModule({});
  });

  it('empieza con la configuración por defecto', () => {
    const store = TestBed.inject(ConfiguracionStore);
    expect(store.configuracion().moneda).toBe(CONFIGURACION_DEFECTO.moneda);
    expect(store.configuracion().capitalDisponible).toBeNull();
    expect(store.configuracion().umbrales.margenMinimoPct).toBe(
      CONFIGURACION_DEFECTO.umbrales.margenMinimoPct,
    );
  });

  it('guarda y recarga la configuración (simulando recarga)', async () => {
    const store = TestBed.inject(ConfiguracionStore);
    const nueva: Configuracion = {
      capitalDisponible: 500000,
      moneda: 'USD',
      umbrales: {
        margenMinimoPct: 20,
        capitalComprometidoMaxPct: 50,
        desviacionPrecioMercadoPct: 10,
        minObservacionesMercado: 5,
      },
    };
    await store.guardar(nueva);

    const recargado = new ConfiguracionStore();
    recargado.cargar();
    expect(recargado.configuracion().capitalDisponible).toBe(500000);
    expect(recargado.configuracion().moneda).toBe('USD');
    expect(recargado.configuracion().umbrales.minObservacionesMercado).toBe(5);
    expect(recargado.error()).toBeNull();
  });

  it('con datos dañados usa los valores por defecto y avisa', () => {
    localStorage.setItem(CLAVE_CONFIGURACION_LOCAL, 'no-es-json');
    const store = TestBed.inject(ConfiguracionStore);
    store.cargar();
    expect(store.error()).toContain('No se pudo leer');
    expect(store.configuracion().moneda).toBe(CONFIGURACION_DEFECTO.moneda);
  });

  it('normaliza valores inválidos de umbrales', async () => {
    const store = TestBed.inject(ConfiguracionStore);
    const conBasura = {
      capitalDisponible: Number.NaN,
      moneda: 'EUR',
      umbrales: {
        margenMinimoPct: Number.POSITIVE_INFINITY,
        capitalComprometidoMaxPct: 60,
        desviacionPrecioMercadoPct: -5,
        minObservacionesMercado: 2.7,
      },
    } as unknown as Configuracion;
    await store.guardar(conBasura);
    expect(store.configuracion().capitalDisponible).toBeNull();
    expect(store.configuracion().moneda).toBe('ARS');
    expect(store.configuracion().umbrales.margenMinimoPct).toBe(
      CONFIGURACION_DEFECTO.umbrales.margenMinimoPct,
    );
    expect(store.configuracion().umbrales.capitalComprometidoMaxPct).toBe(60);
    expect(store.configuracion().umbrales.minObservacionesMercado).toBe(3);
  });
});
