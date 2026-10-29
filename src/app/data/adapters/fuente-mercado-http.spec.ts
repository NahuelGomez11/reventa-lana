import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FuenteMercadoHttp, parsearRespuestaMercado } from './fuente-mercado-http';

describe('parsearRespuestaMercado', () => {
  it('mapea una respuesta válida del backend', () => {
    const r = parsearRespuestaMercado({
      estado: 'ok',
      total: 1,
      consultadoEn: '2026-10-19T10:00:00.000Z',
      publicaciones: [
        {
          id: 'MLA1',
          itemId: 'MLA1',
          titulo: 'Auriculares X',
          precio: 15000,
          moneda: 'ARS',
          url: 'https://x/MLA1',
          condicion: 'nuevo',
          envio: { tipo: 'gratis', costo: null },
        },
      ],
    });
    expect(r.estado).toBe('ok');
    expect(r.total).toBe(1);
    expect(r.publicaciones).toHaveLength(1);
    expect(r.publicaciones[0].precio).toBe(15000);
    expect(r.publicaciones[0].envio.tipo).toBe('gratis');
    expect(r.consultadoEn).toBe('2026-10-19T10:00:00.000Z');
  });

  it('deja de lado publicaciones sin precio válido', () => {
    const r = parsearRespuestaMercado({
      publicaciones: [
        { titulo: 'sin precio' },
        { titulo: 'precio cero', precio: 0 },
        { titulo: 'ok', precio: 10 },
      ],
    });
    expect(r.publicaciones).toHaveLength(1);
    expect(r.estado).toBe('ok');
  });

  it('devuelve sin_resultados cuando no hay publicaciones válidas', () => {
    const r = parsearRespuestaMercado({ publicaciones: [] });
    expect(r.estado).toBe('sin_resultados');
    expect(r.publicaciones).toHaveLength(0);
  });

  it('devuelve error si la respuesta no es un objeto', () => {
    expect(parsearRespuestaMercado(null).estado).toBe('error');
    expect(parsearRespuestaMercado('texto').estado).toBe('error');
  });

  it('respeta el estado explícito informado por el backend', () => {
    expect(parsearRespuestaMercado({ estado: 'limite', publicaciones: [] }).estado).toBe('limite');
  });
});

describe('FuenteMercadoHttp', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
  });

  afterEach(() => http.verify());

  const url = 'http://localhost:3000/market/search';

  it('no está configurada sin baseUrl y no consulta', async () => {
    const f = new FuenteMercadoHttp(cliente, null);
    expect(f.configurada).toBe(false);
    const r = await f.buscar({ q: 'x', siteId: 'MLA' });
    expect(r.estado).toBe('no_configurado');
  });

  it('consulta el backend con los parámetros de búsqueda', async () => {
    const f = new FuenteMercadoHttp(cliente, url);
    expect(f.configurada).toBe(true);
    const promesa = f.buscar({ q: 'auriculares', siteId: 'MLA', limite: 20 });
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('auriculares');
    expect(req.request.params.get('site_id')).toBe('MLA');
    expect(req.request.params.get('limit')).toBe('20');
    req.flush({ estado: 'ok', publicaciones: [{ titulo: 'A', precio: 5 }] });
    const r = await promesa;
    expect(r.publicaciones).toHaveLength(1);
  });

  it('traduce 429 a límite alcanzado', async () => {
    const f = new FuenteMercadoHttp(cliente, url);
    const promesa = f.buscar({ q: 'x', siteId: 'MLA' });
    http.expectOne(() => true).flush(null, { status: 429, statusText: 'Too Many Requests' });
    expect((await promesa).estado).toBe('limite');
  });

  it('traduce un error de red a no disponible', async () => {
    const f = new FuenteMercadoHttp(cliente, url);
    const promesa = f.buscar({ q: 'x', siteId: 'MLA' });
    http.expectOne(() => true).error(new ErrorEvent('error'));
    expect((await promesa).estado).toBe('no_disponible');
  });
});
