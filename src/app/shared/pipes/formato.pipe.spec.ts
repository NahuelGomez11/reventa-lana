import { FechaPipe, ImportePipe, NumeroPipe, PorcentajePipe } from './formato.pipe';

describe('ImportePipe', () => {
  const pipe = new ImportePipe();

  it('devuelve guion cuando no hay dato (null/undefined/NaN)', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform(Number.NaN)).toBe('—');
  });

  it('formatea importes en ARS con separadores locales', () => {
    const salida = pipe.transform(1234567.5, 'ARS');
    expect(salida).toContain('1.234.567');
    expect(salida).toContain(',5');
  });

  it('formatea importes en USD', () => {
    const salida = pipe.transform(1500, 'USD');
    expect(salida).toMatch(/1\.500/);
  });

  it('nunca convierte null en cero', () => {
    expect(pipe.transform(null)).not.toContain('0');
  });
});

describe('PorcentajePipe', () => {
  const pipe = new PorcentajePipe();

  it('devuelve guion cuando no hay dato', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('formatea con un decimal por defecto', () => {
    const salida = pipe.transform(12.345);
    expect(salida).toContain('12,3');
    expect(salida).toContain('%');
  });

  it('respeta la cantidad de decimales indicada', () => {
    const salida = pipe.transform(12.3456, 2);
    expect(salida).toContain('12,35');
  });
});

describe('NumeroPipe', () => {
  const pipe = new NumeroPipe();

  it('devuelve guion cuando no hay dato', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('redondea a entero por defecto', () => {
    expect(pipe.transform(12.6)).toBe('13');
  });

  it('permite decimales explícitos', () => {
    expect(pipe.transform(12.345, 2)).toContain('12,35');
  });
});

describe('FechaPipe', () => {
  const pipe = new FechaPipe();

  it('devuelve guion cuando no hay fecha o es inválida', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('no-es-fecha')).toBe('—');
  });

  it('formatea una fecha ISO', () => {
    const salida = pipe.transform('2026-03-05T13:45:00.000Z');
    expect(salida).not.toBe('—');
    expect(salida).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
