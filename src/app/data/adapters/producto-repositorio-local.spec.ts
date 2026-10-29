import {
  CLAVE_PRODUCTOS_LOCALES,
  ProductoRepositorioLocal,
} from './producto-repositorio-local';
import { ErrorRepositorio } from '../ports/producto-repositorio';
import { crearProductoNuevo } from '../../core/models/producto.model';

function datos(): ReturnType<typeof crearProductoNuevo> {
  return {
    ...crearProductoNuevo(),
    nombre: 'Auriculares',
    categoria: 'Audio',
    datos: {
      cantidad: 5,
      capitalDisponible: 100000,
      costosCompra: { precioCompraUnitario: 100, envioProveedor: 0, otrosCostosAdquisicion: 0 },
      costosVenta: {
        precioVentaObjetivo: 200,
        comisionPorcentaje: 10,
        comisionMonto: null,
        envioCliente: 0,
        publicidadPorUnidad: 0,
        publicidadPresupuesto: null,
        impuestosPorcentaje: 0,
        impuestosMonto: null,
        otrosCostosVenta: 0,
      },
    },
  };
}

function registroValido(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...datos(),
    id: 'p-1',
    fuente: 'usuario',
    creadoEn: '2026-01-01T00:00:00.000Z',
    actualizadoEn: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProductoRepositorioLocal', () => {
  beforeEach(() => {
    localStorage.removeItem(CLAVE_PRODUCTOS_LOCALES);
  });

  it('crea productos con id estable y fechas', async () => {
    const repo = new ProductoRepositorioLocal(localStorage);
    const p = await repo.crear(datos());
    expect(p.id).toBeTruthy();
    expect(p.fuente).toBe('usuario');
    expect(p.creadoEn).toBe(p.actualizadoEn);
    expect(new Date(p.creadoEn).getTime()).not.toBeNaN();
  });

  it('conserva los datos tras simular una recarga con una instancia nueva', async () => {
    const creada = await new ProductoRepositorioLocal(localStorage).crear(datos());
    const trasRecarga = await new ProductoRepositorioLocal(localStorage).obtener(creada.id);
    expect(trasRecarga?.nombre).toBe('Auriculares');
    expect(trasRecarga?.datos.cantidad).toBe(5);
    expect(trasRecarga?.id).toBe(creada.id);
  });

  it('lista, actualiza y elimina', async () => {
    const repo = new ProductoRepositorioLocal(localStorage);
    const p = await repo.crear(datos());
    expect(await repo.listar()).toHaveLength(1);

    const actualizado = await repo.actualizar(p.id, { nombre: 'Otro nombre' });
    expect(actualizado.nombre).toBe('Otro nombre');
    expect(actualizado.creadoEn).toBe(p.creadoEn);
    expect(actualizado.id).toBe(p.id);

    await repo.eliminar(p.id);
    expect(await repo.listar()).toHaveLength(0);
  });

  it('devuelve null al consultar un id inexistente', async () => {
    const repo = new ProductoRepositorioLocal(localStorage);
    expect(await repo.obtener('id-que-no-existe')).toBeNull();
  });

  it('lanza no_encontrado al actualizar o eliminar un id inexistente', async () => {
    const repo = new ProductoRepositorioLocal(localStorage);
    await expect(repo.actualizar('id-que-no-existe', { nombre: 'x' })).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
    await expect(repo.eliminar('id-que-no-existe')).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });

  it('informa error de lectura con datos dañados sin sobrescribirlos', async () => {
    localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, '{esto no es json');
    const repo = new ProductoRepositorioLocal(localStorage);
    await expect(repo.listar()).rejects.toBeInstanceOf(ErrorRepositorio);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
    expect(localStorage.getItem(CLAVE_PRODUCTOS_LOCALES)).toBe('{esto no es json');
  });

  it('informa error y no sobrescribe cuando hay registros incompatibles', async () => {
    const crudo = JSON.stringify([{ id: 'x', nombre: 'sin datos' }]);
    localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, crudo);
    const repo = new ProductoRepositorioLocal(localStorage);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
    expect(localStorage.getItem(CLAVE_PRODUCTOS_LOCALES)).toBe(crudo);
  });

  it('informa error cuando el contenido no es un arreglo', async () => {
    localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, '{"no":"es arreglo"}');
    const repo = new ProductoRepositorioLocal(localStorage);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
  });

  it('carga un registro completamente válido (control positivo)', async () => {
    const repo = new ProductoRepositorioLocal(localStorage);
    localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, JSON.stringify([registroValido()]));
    const lista = await repo.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0].datos.cantidad).toBe(5);
  });

  it('rechaza y conserva si un elemento de observaciones no es objeto', async () => {
    const crudo = JSON.stringify([registroValido({ observaciones: [null] })]);
    localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, crudo);
    const repo = new ProductoRepositorioLocal(localStorage);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
    expect(localStorage.getItem(CLAVE_PRODUCTOS_LOCALES)).toBe(crudo);
  });

  it('rechaza y conserva si un elemento de simulacionPrecios no es numérico', async () => {
    const crudo = JSON.stringify([registroValido({ simulacionPrecios: [100, 'x'] })]);
    localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, crudo);
    const repo = new ProductoRepositorioLocal(localStorage);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
    expect(localStorage.getItem(CLAVE_PRODUCTOS_LOCALES)).toBe(crudo);
  });

  it('con registros válidos e incompatibles mezclados rechaza todo y conserva el original', async () => {
    const crudo = JSON.stringify([
      registroValido(),
      { id: 'roto', nombre: 'sin datos' },
    ]);
    localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, crudo);
    const repo = new ProductoRepositorioLocal(localStorage);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
    expect(localStorage.getItem(CLAVE_PRODUCTOS_LOCALES)).toBe(crudo);
  });

  it('una lectura fallida no provoca una escritura que borre los datos', async () => {
    const crudo = JSON.stringify([{ id: 'x', nombre: 'sin datos' }]);
    localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, crudo);
    const repo = new ProductoRepositorioLocal(localStorage);
    await expect(repo.crear(datos())).rejects.toMatchObject({ codigo: 'lectura' });
    await expect(repo.eliminar('x')).rejects.toMatchObject({ codigo: 'lectura' });
    expect(localStorage.getItem(CLAVE_PRODUCTOS_LOCALES)).toBe(crudo);
  });

  it('informa error de escritura cuando el almacenamiento falla', async () => {
    const roto = {
      getItem: () => null,
      setItem: () => {
        throw new Error('cuota llena');
      },
    };
    const repo = new ProductoRepositorioLocal(roto);
    await expect(repo.crear(datos())).rejects.toMatchObject({ codigo: 'escritura' });
  });

  it('sin almacenamiento disponible informa el error en lectura y escritura', async () => {
    const repo = new ProductoRepositorioLocal(null);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
    await expect(repo.crear(datos())).rejects.toMatchObject({ codigo: 'escritura' });
  });
});
