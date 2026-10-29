import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MERCADO_CONFIG, MercadoConfig } from '../src/config/mercado.config';
import { ResultadoBusquedaMercado } from '../src/mercado/contrato';
import { FUENTE_MERCADO } from '../src/mercado/fuente-mercado.port';
import { MercadoModule } from '../src/mercado/mercado.module';

function config(overrides: Partial<MercadoConfig> = {}): MercadoConfig {
  return {
    apiBase: 'https://api.mercadolibre.com',
    siteId: 'MLA',
    clientId: 'APP_ID',
    clientSecret: 'SECRETO_CLIENTE',
    refreshToken: 'REFRESH_SECRETO',
    tokenStorePath: 'no-usado.json',
    maxResultados: 50,
    timeoutMs: 1000,
    reqPorMinuto: 100,
    corsOrigin: 'http://localhost:4200',
    port: 3000,
    authBase: 'https://auth.mercadolibre.com.ar',
    oauthRedirectUri: null,
    oauthPkce: false,
    oauthStateStorePath: 'no-usado-oauth.json',
    ...overrides,
  };
}

function resultado(estado: ResultadoBusquedaMercado['estado']): ResultadoBusquedaMercado {
  return {
    estado,
    fuente: 'mercadolibre',
    publicaciones:
      estado === 'ok'
        ? [
            {
              id: 'MLA1',
              fuente: 'mercadolibre',
              itemId: 'MLA1',
              productId: null,
              titulo: 'Auriculares X',
              precio: 15000,
              moneda: 'ARS',
              url: 'https://x/MLA1',
              vendedor: null,
              condicion: 'nuevo',
              envio: { tipo: 'gratis', costo: null },
              disponible: true,
              consultadoEn: '2026-10-19T10:00:00.000Z',
            },
          ]
        : [],
    total: estado === 'ok' ? 1 : 0,
    consultadoEn: '2026-10-19T10:00:00.000Z',
    mensaje: estado === 'no_configurado' ? 'sin credenciales' : null,
  };
}

describe('MercadoController', () => {
  let app: INestApplication;

  async function crearApp(
    cfg: MercadoConfig,
    estado: ResultadoBusquedaMercado['estado'] = 'ok',
  ): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({ imports: [MercadoModule] })
      .overrideProvider(MERCADO_CONFIG)
      .useValue(cfg)
      .overrideProvider(FUENTE_MERCADO)
      .useValue({ buscar: jest.fn(async () => resultado(estado)) })
      .compile();
    const creada = moduleRef.createNestApplication();
    await creada.init();
    return creada;
  }

  afterEach(async () => {
    if (app) await app.close();
  });

  it('rechaza la consulta sin parametro q (400)', async () => {
    app = await crearApp(config());
    await request(app.getHttpServer()).get('/market/search').expect(400);
  });

  it('rechaza site_id invalido (400)', async () => {
    app = await crearApp(config());
    await request(app.getHttpServer()).get('/market/search?q=x&site_id=XX').expect(400);
  });

  it('rechaza limit fuera de rango o no numerico (400)', async () => {
    app = await crearApp(config({ maxResultados: 50 }));
    await request(app.getHttpServer()).get('/market/search?q=x&limit=999').expect(400);
    await request(app.getHttpServer()).get('/market/search?q=x&limit=abc').expect(400);
  });

  it('rechaza una busqueda demasiado larga (400)', async () => {
    app = await crearApp(config());
    await request(app.getHttpServer())
      .get(`/market/search?q=${'a'.repeat(200)}`)
      .expect(400);
  });

  it('devuelve el contrato con una consulta valida y sin secretos', async () => {
    app = await crearApp(config());
    const res = await request(app.getHttpServer())
      .get('/market/search?q=auriculares&limit=10')
      .expect(200);
    expect(res.body.estado).toBe('ok');
    expect(res.body.publicaciones[0].titulo).toBe('Auriculares X');
    const texto = JSON.stringify(res.body);
    expect(texto).not.toContain('SECRETO_CLIENTE');
    expect(texto).not.toContain('REFRESH_SECRETO');
  });

  it('aplica el limite de consultas por minuto (429)', async () => {
    app = await crearApp(config({ reqPorMinuto: 1 }));
    await request(app.getHttpServer()).get('/market/search?q=x').expect(200);
    const segunda = await request(app.getHttpServer()).get('/market/search?q=x').expect(429);
    expect(segunda.body.estado).toBe('limite');
  });

  it('propaga el estado no_configurado de la fuente', async () => {
    app = await crearApp(config({ clientId: null }), 'no_configurado');
    const res = await request(app.getHttpServer()).get('/market/search?q=x').expect(200);
    expect(res.body.estado).toBe('no_configurado');
  });
});
