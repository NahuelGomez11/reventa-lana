import { calcularEstadisticasMercado, diferenciaPorcentualVsMediana } from './market-stats';

describe('calcularEstadisticasMercado', () => {
  it('calcula min, max, media y mediana con cantidad impar', () => {
    const res = calcularEstadisticasMercado([300, 100, 200]);
    expect(res.cantidad).toBe(3);
    expect(res.minimo).toBe(100);
    expect(res.maximo).toBe(300);
    expect(res.media).toBeCloseTo(200, 6);
    expect(res.mediana).toBeCloseTo(200, 6);
    expect(res.suficiente).toBe(true);
  });

  it('calcula mediana par como promedio de los dos centrales', () => {
    const res = calcularEstadisticasMercado([100, 200, 300, 400]);
    expect(res.mediana).toBeCloseTo(250, 6);
    expect(res.media).toBeCloseTo(250, 6);
  });

  it('marca información insuficiente bajo el mínimo de observaciones', () => {
    const res = calcularEstadisticasMercado([100], 3);
    expect(res.suficiente).toBe(false);
    expect(res.advertencias.some((a) => a.includes('insuficiente'))).toBe(true);
  });

  it('ignora precios no positivos y no numéricos con advertencia', () => {
    const res = calcularEstadisticasMercado([100, 0, -5, Number.NaN], 3);
    expect(res.cantidad).toBe(1);
    expect(res.minimo).toBe(100);
    expect(res.advertencias.length).toBeGreaterThanOrEqual(3);
  });

  it('devuelve nulos sin observaciones válidas', () => {
    const res = calcularEstadisticasMercado([], 3);
    expect(res.cantidad).toBe(0);
    expect(res.mediana).toBeNull();
    expect(res.suficiente).toBe(false);
  });
});

describe('diferenciaPorcentualVsMediana', () => {
  it('indica porcentaje por encima y por debajo', () => {
    expect(diferenciaPorcentualVsMediana(120, 100)).toBeCloseTo(20, 6);
    expect(diferenciaPorcentualVsMediana(80, 100)).toBeCloseTo(-20, 6);
  });

  it('devuelve null sin precio propio, sin mediana o con mediana no positiva', () => {
    expect(diferenciaPorcentualVsMediana(null, 100)).toBeNull();
    expect(diferenciaPorcentualVsMediana(100, null)).toBeNull();
    expect(diferenciaPorcentualVsMediana(100, 0)).toBeNull();
    expect(diferenciaPorcentualVsMediana(100, -10)).toBeNull();
  });
});
