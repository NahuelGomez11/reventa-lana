import { extraerItemIdDeUrl } from './extraer-item-id';

describe('extraerItemIdDeUrl', () => {
  it('extrae el id del parámetro wid', () => {
    const url =
      'https://www.mercadolibre.com.ar/impresora-3d-anycubic-kobra-x-fdm-4-colores-nativos/up/MLAU4323260255#polycard_client=x&wid=MLA1900308899&sid=recos';
    expect(extraerItemIdDeUrl(url)).toBe('MLA1900308899');
  });

  it('extrae un id que aparece directo en el path', () => {
    expect(extraerItemIdDeUrl('https://www.mercadolibre.com.ar/p/MLA12345678')).toBe('MLA12345678');
  });

  it('no confunde un id de producto universal (MLAU...) con un item', () => {
    expect(extraerItemIdDeUrl('https://www.mercadolibre.com.ar/up/MLAU4323260255')).toBeNull();
  });

  it('devuelve null para texto vacío o sin identificador', () => {
    expect(extraerItemIdDeUrl('')).toBeNull();
    expect(extraerItemIdDeUrl('https://example.com/producto')).toBeNull();
  });

  it('acepta un id suelto', () => {
    expect(extraerItemIdDeUrl('MLA987654321')).toBe('MLA987654321');
  });
});
