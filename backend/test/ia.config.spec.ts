import { leerConfigIa } from '../src/ia/ia.config';

describe('leerConfigIa', () => {
  it('por defecto no hay proveedor de IA (ninguno)', () => {
    const c = leerConfigIa({});
    expect(c.proveedor).toBe('ninguno');
    expect(c.geminiApiKey).toBeNull();
  });

  it('activa gemini cuando hay proveedor y key', () => {
    const c = leerConfigIa({ IA_PROVEEDOR: 'gemini', GEMINI_API_KEY: 'AIza-test' });
    expect(c.proveedor).toBe('gemini');
    expect(c.geminiApiKey).toBe('AIza-test');
  });

  it('desactiva gemini si falta la API key (no inventa configuracion)', () => {
    const c = leerConfigIa({ IA_PROVEEDOR: 'gemini', GEMINI_API_KEY: '   ' });
    expect(c.proveedor).toBe('ninguno');
  });

  it('un proveedor desconocido cae a ninguno', () => {
    const c = leerConfigIa({ IA_PROVEEDOR: 'openai', GEMINI_API_KEY: 'x' });
    expect(c.proveedor).toBe('ninguno');
  });

  it('usa valores por defecto sensatos para modelo, busqueda y base', () => {
    const c = leerConfigIa({ IA_PROVEEDOR: 'gemini', GEMINI_API_KEY: 'k' });
    expect(c.geminiModelo).toBe('gemini-3.5-flash');
    expect(c.geminiBusquedaWeb).toBe(true);
    expect(c.geminiApiBase).toBe('https://generativelanguage.googleapis.com');
    expect(c.timeoutMs).toBe(60000);
    expect(c.reintentos).toBe(3);
  });

  it('permite desactivar la busqueda web explicitamente', () => {
    const c = leerConfigIa({ IA_PROVEEDOR: 'gemini', GEMINI_API_KEY: 'k', GEMINI_BUSQUEDA_WEB: 'false' });
    expect(c.geminiBusquedaWeb).toBe(false);
  });
});
