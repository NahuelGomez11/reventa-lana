import { calcularEstadisticasMercado } from './market-stats';
import { clasificarPrecioEnMercado } from './recomendacion-precio';

describe('clasificarPrecioEnMercado', () => {
  it('devuelve "sin_mercado" cuando no hay observaciones válidas', () => {
    const stats = calcularEstadisticasMercado([]);
    expect(clasificarPrecioEnMercado(100, stats)).toBe('sin_mercado');
  });

  it('clasifica por debajo del mínimo observado', () => {
    const stats = calcularEstadisticasMercado([200, 250, 300]);
    expect(clasificarPrecioEnMercado(150, stats)).toBe('por_debajo');
  });

  it('clasifica dentro del rango (inclusive en los extremos)', () => {
    const stats = calcularEstadisticasMercado([200, 250, 300]);
    expect(clasificarPrecioEnMercado(250, stats)).toBe('dentro');
    expect(clasificarPrecioEnMercado(200, stats)).toBe('dentro');
    expect(clasificarPrecioEnMercado(300, stats)).toBe('dentro');
  });

  it('clasifica por encima del máximo observado', () => {
    const stats = calcularEstadisticasMercado([200, 250, 300]);
    expect(clasificarPrecioEnMercado(350, stats)).toBe('por_encima');
  });
});
