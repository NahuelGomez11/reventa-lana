import { IaConfig } from '../src/ia/ia.config';
import { IaProvider, PublicacionParaResumen, ResumenIa } from '../src/ia/ia.port';
import { IaService } from '../src/ia/ia.service';
import { PublicacionMercado } from '../src/mercado/contrato';

function config(overrides: Partial<IaConfig> = {}): IaConfig {
  return {
    proveedor: 'gemini',
    geminiApiKey: 'AIza-test',
    geminiModelo: 'gemini-2.5-flash',
    geminiBusquedaWeb: true,
    geminiApiBase: 'https://generativelanguage.googleapis.com',
    timeoutMs: 5000,
    reintentos: 3,
    ...overrides,
  };
}

const OK: ResumenIa = {
  proveedor: 'gemini',
  resumen: 'ok',
  fuentes: ['https://ml.com/a'],
  idsAgrupados: ['a'],
  estado: 'ok',
  mensaje: null,
};

function proveedor(overrides: Partial<IaProvider> = {}): IaProvider {
  return {
    id: 'gemini',
    configurada: true,
    resumir: jest.fn(async () => OK),
    ...overrides,
  };
}

const PUBLICACION: PublicacionMercado = {
  id: 'a',
  fuente: 'mercadolibre',
  itemId: 'MLA1',
  productId: null,
  titulo: 'Auriculares',
  precio: 71999,
  moneda: 'ARS',
  url: 'https://ml.com/a',
  vendedor: null,
  condicion: 'nuevo',
  envio: { tipo: 'desconocido', costo: null },
  disponible: true,
  consultadoEn: '2026-10-21T10:00:00.000Z',
};

describe('IaService', () => {
  it('reporta no configurada cuando el proveedor es ninguno', () => {
    const service = new IaService(proveedor({ configurada: false }), config({ proveedor: 'ninguno' }));
    expect(service.configurada).toBe(false);
  });

  it('convierte publicaciones de mercado al contrato de IA y delega', async () => {
    const resumir = jest.fn(async (e) => {
      expect(e.publicaciones[0]).toEqual<PublicacionParaResumen>({
        id: 'a',
        titulo: 'Auriculares',
        precio: 71999,
        moneda: 'ARS',
        url: 'https://ml.com/a',
        vendedor: null,
        condicion: 'nuevo',
      });
      return OK;
    });
    const service = new IaService(proveedor({ resumir } as Partial<IaProvider>), config());

    const r = await service.resumirPublicaciones('Auriculares', [PUBLICACION]);

    expect(resumir).toHaveBeenCalledTimes(1);
    expect(r).toEqual(OK);
  });

  it('nunca envia credenciales ni la key al proveedor', async () => {
    const resumir = jest.fn(async () => OK);
    const service = new IaService(proveedor({ resumir } as Partial<IaProvider>), config());

    await service.resumirPublicaciones('Auriculares', [PUBLICACION]);

    const entrada = (resumir.mock.calls[0] as unknown[])[0];
    expect(JSON.stringify(entrada)).not.toContain('AIza-test');
    expect(JSON.stringify(entrada)).not.toContain('client_secret');
  });
});
