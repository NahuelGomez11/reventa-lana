import { PublicacionMercado } from '../../core/models/mercado.model';
import { ObservacionMercado } from '../../core/models/producto.model';
import {
  claveObservacion,
  estaDesactualizada,
  fusionarObservaciones,
  publicacionAObservacion,
} from './observaciones-mercado';

function publicacion(parcial: Partial<PublicacionMercado> = {}): PublicacionMercado {
  return {
    id: 'pub-1',
    fuente: 'mercadolibre',
    itemId: 'MLA123',
    productId: null,
    titulo: 'Auriculares X',
    precio: 15000,
    moneda: 'ARS',
    url: 'https://articulo.mercadolibre.com.ar/MLA-123',
    vendedor: 'VendedorTest',
    condicion: 'nuevo',
    envio: { tipo: 'gratis', costo: null },
    disponible: true,
    consultadoEn: '2026-10-10T10:00:00.000Z',
    ...parcial,
  };
}

function observacion(parcial: Partial<ObservacionMercado> = {}): ObservacionMercado {
  return {
    id: 'obs-1',
    precio: 100,
    vendedor: null,
    url: null,
    marca: null,
    modelo: null,
    caracteristicas: null,
    condicion: 'desconocida',
    accesorios: null,
    garantia: null,
    envio: null,
    fechaConsulta: '2026-10-10T10:00:00.000Z',
    ...parcial,
  };
}

describe('publicacionAObservacion', () => {
  it('mapea los datos informados por la fuente y marca el origen automático', () => {
    const o = publicacionAObservacion(publicacion());
    expect(o.precio).toBe(15000);
    expect(o.vendedor).toBe('VendedorTest');
    expect(o.url).toBe('https://articulo.mercadolibre.com.ar/MLA-123');
    expect(o.caracteristicas).toBe('Auriculares X');
    expect(o.condicion).toBe('nuevo');
    expect(o.envio).toBe('Gratis');
    expect(o.fechaConsulta).toBe('2026-10-10T10:00:00.000Z');
    expect(o.origen).toBe('auto');
    expect(o.fuente).toBe('mercadolibre');
    expect(o.refExternaId).toBe('MLA123');
  });

  it('no inventa marca ni modelo si la fuente no los informa', () => {
    const o = publicacionAObservacion(publicacion());
    expect(o.marca).toBeNull();
    expect(o.modelo).toBeNull();
    expect(o.garantia).toBeNull();
  });

  it('describe el envío con costo sin asumir un importe', () => {
    expect(publicacionAObservacion(publicacion({ envio: { tipo: 'pago', costo: 2500 } })).envio).toBe(
      'Costo informado: 2500',
    );
    expect(publicacionAObservacion(publicacion({ envio: { tipo: 'pago', costo: null } })).envio).toBe(
      'Con costo (importe no informado)',
    );
    expect(
      publicacionAObservacion(publicacion({ envio: { tipo: 'desconocido', costo: null } })).envio,
    ).toBeNull();
  });
});

describe('claveObservacion', () => {
  it('prioriza id externo, luego url, luego id local', () => {
    expect(claveObservacion(observacion({ fuente: 'mercadolibre', refExternaId: 'MLA1', url: 'u' }))).toBe(
      'mercadolibre:MLA1',
    );
    expect(claveObservacion(observacion({ url: 'https://x' }))).toBe('url:https://x');
    expect(claveObservacion(observacion({ id: 'obs-9' }))).toBe('id:obs-9');
  });
});

describe('fusionarObservaciones', () => {
  it('no duplica la misma publicación externa', () => {
    const existente = observacion({ refExternaId: 'MLA1', fuente: 'mercadolibre', precio: 100 });
    const repetida = observacion({ id: 'obs-2', refExternaId: 'MLA1', fuente: 'mercadolibre', precio: 120 });
    const nueva = observacion({ id: 'obs-3', refExternaId: 'MLA2', fuente: 'mercadolibre', precio: 130 });

    const res = fusionarObservaciones([existente], [repetida, nueva]);
    expect(res).toHaveLength(2);
    expect(res[0].precio).toBe(100);
    expect(res[1].precio).toBe(130);
  });

  it('conserva las existentes y agrega las nuevas al final', () => {
    const a = observacion({ id: 'a' });
    const b = observacion({ id: 'b' });
    const res = fusionarObservaciones([a], [b]);
    expect(res.map((o) => o.id)).toEqual(['a', 'b']);
  });
});

describe('estaDesactualizada', () => {
  it('detecta datos viejos dentro del umbral', () => {
    expect(estaDesactualizada('2026-10-10T00:00:00.000Z', '2026-10-13T00:00:00.000Z', 7)).toBe(false);
    expect(estaDesactualizada('2026-10-01T00:00:00.000Z', '2026-10-13T00:00:00.000Z', 7)).toBe(true);
  });

  it('considera desactualizada una fecha inválida', () => {
    expect(estaDesactualizada('no-es-fecha', '2026-10-13T00:00:00.000Z', 7)).toBe(true);
  });
});
