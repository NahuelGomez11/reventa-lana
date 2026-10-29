import { AnalisisProducto } from '../domain/analysis/analisis-producto';
import { construirEscala, fraseVsMercado, posicionEnEscala } from './escala-precios';

function analisis(partes: {
  minimo?: number | null;
  maximo?: number | null;
  mediana?: number | null;
  costo?: number | null;
  equilibrio?: number | null;
  conResultado?: boolean;
}): AnalisisProducto {
  const conResultado = partes.conResultado ?? true;
  return {
    estadisticas: {
      cantidad: 3,
      minimo: partes.minimo ?? null,
      maximo: partes.maximo ?? null,
      media: null,
      mediana: partes.mediana ?? null,
      suficiente: true,
      advertencias: [],
    },
    resultado: conResultado
      ? ({
          costoAdquisicionUnitarioEfectivo: partes.costo ?? 100,
          precioMinimoRentable: partes.equilibrio ?? null,
        } as unknown as AnalisisProducto['resultado'])
      : null,
  } as unknown as AnalisisProducto;
}

describe('construirEscala', () => {
  it('incluye precio propio, mediana, costo, equilibrio y rango del mercado', () => {
    const e = construirEscala(
      analisis({ minimo: 80, maximo: 120, mediana: 100, costo: 70, equilibrio: 75 }),
      110,
    );
    expect(e).not.toBeNull();
    expect(e!.marcadores.map((m) => m.tono)).toEqual(['propio', 'mercado', 'costo', 'equilibrio']);
    expect(e!.banda).toEqual({ min: 80, max: 120 });
    expect(e!.desde).toBeLessThan(70);
    expect(e!.hasta).toBeGreaterThan(120);
  });

  it('sin mercado ni resultado usa solo el precio propio', () => {
    const e = construirEscala(analisis({ conResultado: false }), 500);
    expect(e!.marcadores).toHaveLength(1);
    expect(e!.marcadores[0].tono).toBe('propio');
    expect(e!.banda).toBeNull();
  });

  it('sin ningún valor devuelve null', () => {
    expect(construirEscala(analisis({ conResultado: false }), null)).toBeNull();
  });

  it('no muestra valores no positivos ni no finitos', () => {
    const e = construirEscala(analisis({ costo: 0, equilibrio: Number.NaN }), 200);
    expect(e!.marcadores.map((m) => m.tono)).toEqual(['propio']);
  });

  it('alterna la etiqueta arriba y abajo', () => {
    const e = construirEscala(analisis({ mediana: 100, costo: 70, equilibrio: 75 }), 110);
    expect(e!.marcadores.map((m) => m.arriba)).toEqual([true, false, true, false]);
  });

  it('con todos los valores iguales sigue dando un rango visible', () => {
    const e = construirEscala(analisis({ conResultado: false }), 100);
    expect(e!.hasta - e!.desde).toBeGreaterThan(0);
  });
});

describe('posicionEnEscala', () => {
  it('limita la posición entre 0 y 100 y evita división por cero', () => {
    expect(posicionEnEscala(50, 0, 100)).toBe(50);
    expect(posicionEnEscala(-10, 0, 100)).toBe(0);
    expect(posicionEnEscala(200, 0, 100)).toBe(100);
    expect(posicionEnEscala(5, 10, 10)).toBe(0);
  });
});

describe('fraseVsMercado', () => {
  it('describe si el precio está por encima, debajo o igual', () => {
    expect(fraseVsMercado(12.4)).toContain('12% por encima');
    expect(fraseVsMercado(-7.6)).toContain('8% por debajo');
    expect(fraseVsMercado(0.2)).toContain('igual');
    expect(fraseVsMercado(null)).toBeNull();
  });
});
