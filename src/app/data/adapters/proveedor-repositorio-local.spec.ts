import { CLAVE_PROVEEDORES_LOCALES, ProveedorRepositorioLocal } from './proveedor-repositorio-local';
import { ErrorRepositorio } from '../ports/producto-repositorio';
import { crearProveedorNuevo } from '../../core/models/proveedor.model';

function datos(): ReturnType<typeof crearProveedorNuevo> {
  return {
    ...crearProveedorNuevo(),
    nombre: 'Distribuidora Sur',
    telefono: '+54 11 5555-1234',
    email: 'ventas@ejemplo.test',
    web: 'https://ejemplo.test',
    direccion: 'Av. Siempre Viva 742',
    notas: 'Buen precio en volumen',
  };
}

function registroValido(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...datos(),
    id: 'prov-1',
    creadoEn: '2026-01-01T00:00:00.000Z',
    actualizadoEn: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProveedorRepositorioLocal', () => {
  beforeEach(() => {
    localStorage.removeItem(CLAVE_PROVEEDORES_LOCALES);
  });

  it('crea proveedores con id estable y fechas', async () => {
    const repo = new ProveedorRepositorioLocal(localStorage);
    const p = await repo.crear(datos());
    expect(p.id).toBeTruthy();
    expect(p.creadoEn).toBe(p.actualizadoEn);
    expect(new Date(p.creadoEn).getTime()).not.toBeNaN();
  });

  it('conserva los datos tras simular una recarga con una instancia nueva', async () => {
    const creada = await new ProveedorRepositorioLocal(localStorage).crear(datos());
    const trasRecarga = await new ProveedorRepositorioLocal(localStorage).obtener(creada.id);
    expect(trasRecarga?.nombre).toBe('Distribuidora Sur');
    expect(trasRecarga?.email).toBe('ventas@ejemplo.test');
    expect(trasRecarga?.telefono).toBe('+54 11 5555-1234');
    expect(trasRecarga?.id).toBe(creada.id);
  });

  it('lista, actualiza y elimina', async () => {
    const repo = new ProveedorRepositorioLocal(localStorage);
    const p = await repo.crear(datos());
    expect(await repo.listar()).toHaveLength(1);

    const actualizado = await repo.actualizar(p.id, { nombre: 'Otro proveedor' });
    expect(actualizado.nombre).toBe('Otro proveedor');
    expect(actualizado.creadoEn).toBe(p.creadoEn);
    expect(actualizado.id).toBe(p.id);

    await repo.eliminar(p.id);
    expect(await repo.listar()).toHaveLength(0);
  });

  it('devuelve null al consultar un id inexistente', async () => {
    const repo = new ProveedorRepositorioLocal(localStorage);
    expect(await repo.obtener('id-que-no-existe')).toBeNull();
  });

  it('lanza no_encontrado al actualizar o eliminar un id inexistente', async () => {
    const repo = new ProveedorRepositorioLocal(localStorage);
    await expect(repo.actualizar('id-que-no-existe', { nombre: 'x' })).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
    await expect(repo.eliminar('id-que-no-existe')).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });

  it('informa error de lectura con datos dañados sin sobrescribirlos', async () => {
    localStorage.setItem(CLAVE_PROVEEDORES_LOCALES, '{esto no es json');
    const repo = new ProveedorRepositorioLocal(localStorage);
    await expect(repo.listar()).rejects.toBeInstanceOf(ErrorRepositorio);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
    expect(localStorage.getItem(CLAVE_PROVEEDORES_LOCALES)).toBe('{esto no es json');
  });

  it('informa error y no sobrescribe cuando hay registros incompatibles', async () => {
    const crudo = JSON.stringify([{ foo: 'bar' }]);
    localStorage.setItem(CLAVE_PROVEEDORES_LOCALES, crudo);
    const repo = new ProveedorRepositorioLocal(localStorage);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
    expect(localStorage.getItem(CLAVE_PROVEEDORES_LOCALES)).toBe(crudo);
  });

  it('informa error cuando el contenido no es un arreglo', async () => {
    localStorage.setItem(CLAVE_PROVEEDORES_LOCALES, '{"no":"es arreglo"}');
    const repo = new ProveedorRepositorioLocal(localStorage);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
  });

  it('carga un registro completamente válido (control positivo)', async () => {
    localStorage.setItem(CLAVE_PROVEEDORES_LOCALES, JSON.stringify([registroValido()]));
    const repo = new ProveedorRepositorioLocal(localStorage);
    const lista = await repo.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0].nombre).toBe('Distribuidora Sur');
  });

  it('una lectura fallida no provoca una escritura que borre los datos', async () => {
    const crudo = JSON.stringify([{ foo: 'bar' }]);
    localStorage.setItem(CLAVE_PROVEEDORES_LOCALES, crudo);
    const repo = new ProveedorRepositorioLocal(localStorage);
    await expect(repo.crear(datos())).rejects.toMatchObject({ codigo: 'lectura' });
    expect(localStorage.getItem(CLAVE_PROVEEDORES_LOCALES)).toBe(crudo);
  });

  it('informa error de escritura cuando el almacenamiento falla', async () => {
    const roto = {
      getItem: () => null,
      setItem: () => {
        throw new Error('cuota llena');
      },
    };
    const repo = new ProveedorRepositorioLocal(roto);
    await expect(repo.crear(datos())).rejects.toMatchObject({ codigo: 'escritura' });
  });

  it('sin almacenamiento disponible informa el error en lectura y escritura', async () => {
    const repo = new ProveedorRepositorioLocal(null);
    await expect(repo.listar()).rejects.toMatchObject({ codigo: 'lectura' });
    await expect(repo.crear(datos())).rejects.toMatchObject({ codigo: 'escritura' });
  });
});
