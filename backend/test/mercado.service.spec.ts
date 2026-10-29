import { MercadoConfig } from '../src/config/mercado.config';
import { ConsultaMercado, ResultadoBusquedaMercado } from '../src/mercado/contrato';
import { MercadoService } from '../src/mercado/mercado.service';

function config(overrides: Partial<MercadoConfig> = {}): MercadoConfig {
  return {
    apiBase: 'https://api.mercadolibre.com',
    siteId: 'MLA',
    clientId: null,
    clientSecret: null,
    refreshToken: null,
    tokenStorePath: 'no-usado.json',
    maxResultados: 50,
    timeoutMs: 1000,
    reqPorMinuto: 60,
    corsOrigin: 'http://localhost:4200',
    port: 3000,
    authBase: 'https://auth.mercadolibre.com.ar',
    oauthRedirectUri: null,
    oauthPkce: false,
    oauthStateStorePath: 'no-usado-oauth.json',
    ...overrides,
  };
}

const VACIO: ResultadoBusquedaMercado = {
  estado: 'ok',
  fuente: 'mercadolibre',
  publicaciones: [],
  total: 0,
  consultadoEn: '2026-10-19T10:00:00.000Z',
  mensaje: null,
};

describe('MercadoService', () => {
  it('recorta el texto y aplica el limite maximo configurado', async () => {
    const buscar = jest.fn(async () => VACIO);
    const obtenerItem = jest.fn(async () => VACIO);
    const service = new MercadoService({ buscar, obtenerItem }, config({ maxResultados: 50 }));

    await service.buscar({ q: '  auriculares  ', siteId: 'MLA', limite: 999 });

    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar).toHaveBeenCalledWith(
      expect.objectContaining<Partial<ConsultaMercado>>({ q: 'auriculares', limite: 50 }),
    );
  });

  it('usa el maximo configurado cuando no se indica limite', async () => {
    const buscar = jest.fn(async () => VACIO);
    const obtenerItem = jest.fn(async () => VACIO);
    const service = new MercadoService({ buscar, obtenerItem }, config({ maxResultados: 20 }));

    await service.buscar({ q: 'x', siteId: 'MLA', limite: Number.NaN });

    expect(buscar).toHaveBeenCalledWith(expect.objectContaining({ limite: 20 }));
  });

  it('nunca pide menos de 1 resultado', async () => {
    const buscar = jest.fn(async () => VACIO);
    const obtenerItem = jest.fn(async () => VACIO);
    const service = new MercadoService({ buscar, obtenerItem }, config());

    await service.buscar({ q: 'x', siteId: 'MLA', limite: 0 });

    expect(buscar).toHaveBeenCalledWith(expect.objectContaining({ limite: 1 }));
  });

  it('delega la consulta en la fuente y devuelve su resultado', async () => {
    const buscar = jest.fn(async () => VACIO);
    const obtenerItem = jest.fn(async () => VACIO);
    const service = new MercadoService({ buscar, obtenerItem }, config());
    const consulta: ConsultaMercado = { q: 'x', siteId: 'MLA', limite: 10 };

    await expect(service.buscar(consulta)).resolves.toEqual(VACIO);
  });
});
