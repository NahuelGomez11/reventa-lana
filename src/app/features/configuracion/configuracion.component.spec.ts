import { TestBed } from '@angular/core/testing';
import { ConfiguracionComponent } from './configuracion.component';
import { ConfiguracionStore } from '../../data/configuracion-store.service';

describe('ConfiguracionComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('carga los valores actuales de la configuración', () => {
    const store = TestBed.inject(ConfiguracionStore);
    const fixture = TestBed.createComponent(ConfiguracionComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.form.controls.moneda.value).toBe('ARS');
    expect(comp.form.controls.margenMinimoPct.value).toBe(
      store.configuracion().umbrales.margenMinimoPct,
    );
  });

  it('guarda la configuración y la deja disponible en el store', async () => {
    const store = TestBed.inject(ConfiguracionStore);
    const fixture = TestBed.createComponent(ConfiguracionComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.form.setValue({
      capitalDisponible: 450000,
      moneda: 'USD',
      margenMinimoPct: 22,
      capitalComprometidoMaxPct: 60,
      desviacionPrecioMercadoPct: 12,
      minObservacionesMercado: 4,
    });
    await comp.guardar();

    expect(store.configuracion().capitalDisponible).toBe(450000);
    expect(store.configuracion().moneda).toBe('USD');
    expect(store.configuracion().umbrales.margenMinimoPct).toBe(22);
    expect(comp.guardado()).toBe(true);
  });

  it('no guarda si un umbral está fuera de rango y lo marca', async () => {
    const store = TestBed.inject(ConfiguracionStore);
    const fixture = TestBed.createComponent(ConfiguracionComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.form.controls.margenMinimoPct.setValue(150);
    await comp.guardar();

    expect(comp.enviado()).toBe(true);
    expect(comp.form.controls.margenMinimoPct.invalid).toBe(true);
    expect(store.configuracion().umbrales.margenMinimoPct).toBe(15);
  });

  it('no propaga un rechazo sin manejar si falla el guardado', async () => {
    const store = TestBed.inject(ConfiguracionStore);
    const fixture = TestBed.createComponent(ConfiguracionComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cuota llena');
    });
    try {
      await expect(comp.guardar()).resolves.toBeUndefined();
      expect(comp.guardado()).toBe(false);
      expect(store.error()).toContain('No se pudo guardar');
    } finally {
      vi.restoreAllMocks();
    }
  });
});
