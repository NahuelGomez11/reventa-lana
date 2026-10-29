import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { IaController } from '../src/ia/ia.controller';
import { IaProvider, ResumenIa } from '../src/ia/ia.port';
import { IaService } from '../src/ia/ia.service';
import { IA_PROVIDER } from '../src/ia/ia.port';
import { IA_CONFIG, IaConfig } from '../src/ia/ia.config';

const OK: ResumenIa = {
  proveedor: 'gemini',
  resumen: 'Resumen de prueba',
  fuentes: ['https://ml.com/a'],
  idsAgrupados: ['a'],
  estado: 'ok',
  mensaje: null,
};

function configIa(): IaConfig {
  return {
    proveedor: 'gemini',
    geminiApiKey: 'AIza-test',
    geminiModelo: 'gemini-2.5-flash',
    geminiBusquedaWeb: true,
    geminiApiBase: 'https://generativelanguage.googleapis.com',
    timeoutMs: 5000,
    reintentos: 3,
  };
}

describe('IaController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const resumir = jest.fn(async (e): Promise<ResumenIa> => {
      (resumir as unknown as { ultima?: unknown }).ultima = e;
      return OK;
    });
    const modulo = await Test.createTestingModule({
      controllers: [IaController],
      providers: [
        IaService,
        { provide: IA_PROVIDER, useValue: { id: 'gemini', configurada: true, resumir } as IaProvider },
        { provide: IA_CONFIG, useValue: configIa() },
      ],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /ia/resumir devuelve el resumen', async () => {
    const r = await request(app.getHttpServer())
      .post('/ia/resumir')
      .send({ consulta: 'Auriculares', publicaciones: [{ id: 'a', titulo: 'Auriculares', precio: 71999, moneda: 'ARS', url: 'https://ml.com/a' }] })
      .expect(201);
    expect(r.body.resumen).toBe('Resumen de prueba');
    expect(r.body.estado).toBe('ok');
  });

  it('descarta publicaciones sin precio o sin titulo validos', async () => {
    const r = await request(app.getHttpServer())
      .post('/ia/resumir')
      .send({
        consulta: 'x',
        publicaciones: [
          { titulo: 'sin precio', precio: 0 },
          { precio: 100 },
          { titulo: 'valido', precio: 100 },
        ],
      })
      .expect(201);
    expect(r.body.resumen).toBe('Resumen de prueba');
  });

  it('acepta consulta y publicaciones vacias sin romper', async () => {
    await request(app.getHttpServer()).post('/ia/resumir').send({}).expect(201);
  });

  it('limita la cantidad de publicaciones procesadas', async () => {
    const muchas = Array.from({ length: 80 }, (_, i) => ({ id: `p${i}`, titulo: `p${i}`, precio: 100 + i }));
    await request(app.getHttpServer()).post('/ia/resumir').send({ consulta: 'x', publicaciones: muchas }).expect(201);
  });
});
