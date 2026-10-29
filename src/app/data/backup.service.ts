import { Injectable, inject } from '@angular/core';
import { Producto, ProductoNuevo } from '../core/models/producto.model';
import { ProveedorCatalogo, ProveedorCatalogoNuevo } from '../core/models/proveedor.model';
import { Configuracion } from '../core/models/configuracion.model';
import { RecargosConfig } from '../core/models/recargos.model';
import { ProductoStore } from './producto-store.service';
import { ProveedorCatalogoStore } from './proveedor-store.service';
import { ConfiguracionStore } from './configuracion-store.service';
import { RecargosStore } from './recargos-store.service';
import { CategoriasStore } from './categorias-store.service';
import { CLAVE_PRODUCTOS_LOCALES } from './adapters/producto-repositorio-local';
import { CLAVE_PROVEEDORES_LOCALES } from './adapters/proveedor-repositorio-local';
import { CLAVE_CONFIGURACION_LOCAL } from './configuracion-store.service';
import { CLAVE_RECARGOS_LOCAL } from './recargos-store.service';
import { CLAVE_CATEGORIAS_LOCAL } from './categorias-store.service';

export interface RespaldoLANA {
  aviso: string;
  version: number;
  exportadoEn: string;
  proveedores: ProveedorCatalogo[];
  productos: Producto[];
  recargos?: RecargosConfig;
  categorias?: string[];
  configuracion?: Configuracion;
}

const AVISO = 'COPIA DE SEGURIDAD LANA. Datos del usuario. Importar fusiona sin duplicar.';

function normalizar(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function claveProveedor(p: ProveedorCatalogo): string {
  const tel = normalizar(p.telefono);
  // Si hay teléfono, la identidad es por teléfono (ignora el nombre).
  if (tel) return 'tel:' + tel;
  return 'nom:' + normalizar(p.nombre);
}

/** Candidato fuzzy para proveedor: mismo teléfono o nombre muy similar. */
function buscarCandidatoProveedorFuzzy(existentes: ProveedorCatalogo[], inc: ProveedorCatalogo): ProveedorCatalogo | null {
  const telInc = normalizar(inc.telefono);
  // si hay teléfono y coincide exactamente, es el mismo
  if (telInc) {
    const exacto = existentes.find((e) => normalizar(e.telefono) === telInc);
    if (exacto) return exacto;
  }
  // fuzzy por nombre (>= 0.6) si no hay teléfono
  if (!telInc) {
    let mejor: { prov: ProveedorCatalogo; score: number } | null = null;
    for (const ex of existentes) {
      if (normalizar(ex.telefono)) continue; // si el existente tiene tel, no fuzzy por nombre
      const score = similitudTokens(inc.nombre, ex.nombre);
      if (score >= 0.6 && (!mejor || score > mejor.score)) {
        mejor = { prov: ex, score };
      }
    }
    return mejor ? mejor.prov : null;
  }
  return null;
}

function tokens(s: string): string[] {
  return normalizar(s).split(/[^a-z0-9áéíóúñ]+/i).filter((t) => t.length > 1);
}

function similitudTokens(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union > 0 ? inter / union : 0;
}

function claveProducto(p: Producto): string {
  const marca = normalizar(p.marca);
  const modelo = normalizar(p.modelo);
  const cat = normalizar(p.categoria);
  // Si hay marca y modelo, la identidad es por marca+modelo+categoria (ignora el nombre).
  if (marca && modelo) return 'mm:' + marca + '|' + modelo + '|' + cat;
  // Si no, por nombre+categoria.
  return 'nc:' + normalizar(p.nombre) + '|' + cat;
}

/** Busca un candidato para fusionar por similitud (mismo rubro y marca si aplica). */
function buscarCandidatoFuzzy(existentes: Producto[], inc: Producto): Producto | null {
  const cat = normalizar(inc.categoria);
  const marcaInc = normalizar(inc.marca);
  let mejor: { prod: Producto; score: number } | null = null;
  for (const ex of existentes) {
    if (normalizar(ex.categoria) !== cat) continue;
    // si ambos tienen marca, deben coincidir
    const marcaEx = normalizar(ex.marca);
    if (marcaInc && marcaEx && marcaInc !== marcaEx) continue;
    const score = similitudTokens(inc.nombre, ex.nombre);
    // también considerar modelo
    const scoreModelo = inc.modelo && ex.modelo ? similitudTokens(inc.modelo, ex.modelo) : 0;
    const total = Math.max(score, scoreModelo);
    if (total >= 0.6 && (!mejor || total > mejor.score)) {
      mejor = { prod: ex, score: total };
    }
  }
  return mejor ? mejor.prod : null;
}

function fusionarProveedor(existing: ProveedorCatalogo, incoming: ProveedorCatalogo): ProveedorCatalogo {
  return {
    ...existing,
    telefono: existing.telefono ?? incoming.telefono,
    email: existing.email ?? incoming.email,
    web: existing.web ?? incoming.web,
    direccion: existing.direccion ?? incoming.direccion,
    notas: existing.notas ?? incoming.notas,
    actualizadoEn: incoming.actualizadoEn > existing.actualizadoEn ? incoming.actualizadoEn : existing.actualizadoEn,
  };
}

function fusionarProducto(existing: Producto, incoming: Producto): Producto {
  // fusionar proveedores (por nombre)
  const provMap = new Map<string, any>();
  for (const p of existing.proveedores) provMap.set(normalizar(p.nombre), { ...p });
  for (const p of incoming.proveedores) {
    const k = normalizar(p.nombre);
    if (provMap.has(k)) {
      const ex = provMap.get(k);
      provMap.set(k, {
        ...ex,
        precioUnitario: ex.precioUnitario || p.precioUnitario,
        envio: ex.envio || p.envio,
        stockDisponible: ex.stockDisponible ?? p.stockDisponible,
        compraMinima: ex.compraMinima || p.compraMinima,
        garantia: ex.garantia ?? p.garantia,
        observaciones: ex.observaciones ?? p.observaciones,
        url: ex.url ?? p.url,
        proveedorId: ex.proveedorId ?? p.proveedorId,
        incompleto: ex.incompleto && p.incompleto,
      });
    } else {
      provMap.set(k, { ...p });
    }
  }
  const proveedores = Array.from(provMap.values());

  // fusionar observaciones (por id, luego por url+precio)
  const obsMap = new Map<string, any>();
  const keyObs = (o: any) => o.id || (o.url + '|' + o.precio);
  for (const o of existing.observaciones) obsMap.set(keyObs(o), { ...o });
  for (const o of incoming.observaciones) {
    const k = keyObs(o);
    if (!obsMap.has(k)) obsMap.set(k, { ...o });
  }
  const observaciones = Array.from(obsMap.values());

  // simulacionPrecios union
  const simSet = new Set([...existing.simulacionPrecios, ...incoming.simulacionPrecios]);

  return {
    ...existing,
    marca: existing.marca || incoming.marca,
    modelo: existing.modelo || incoming.modelo,
    categoria: existing.categoria || incoming.categoria,
    gama: existing.gama ?? incoming.gama,
    caracteristicas: existing.caracteristicas || incoming.caracteristicas,
    proveedorPrincipal: existing.proveedorPrincipal ?? incoming.proveedorPrincipal,
    proveedorPrincipalId: existing.proveedorPrincipalId ?? incoming.proveedorPrincipalId,
    precioMinimoAceptable: existing.precioMinimoAceptable ?? incoming.precioMinimoAceptable,
    datos: existing.datos.cantidad != null ? existing.datos : incoming.datos,
    proveedores,
    observaciones,
    simulacionPrecios: Array.from(simSet),
    tipoProductoId: existing.tipoProductoId ?? incoming.tipoProductoId,
    ofertaCompraId: existing.ofertaCompraId ?? incoming.ofertaCompraId,
    actualizadoEn: incoming.actualizadoEn > existing.actualizadoEn ? incoming.actualizadoEn : existing.actualizadoEn,
  };
}

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly productoStore = inject(ProductoStore);
  private readonly proveedorStore = inject(ProveedorCatalogoStore);
  private readonly configStore = inject(ConfiguracionStore);
  private readonly recargosStore = inject(RecargosStore);
  private readonly categoriasStore = inject(CategoriasStore);

  exportar(): void {
    const respaldo: RespaldoLANA = {
      aviso: AVISO,
      version: 1,
      exportadoEn: new Date().toISOString(),
      proveedores: this.proveedorStore.proveedores(),
      productos: this.productoStore.productos(),
      recargos: this.recargosStore.config(),
      categorias: this.categoriasStore.categorias(),
      configuracion: this.configStore.configuracion(),
    };
    const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lana-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importar(archivo: File): Promise<{ productos: number; proveedores: number; mensaje: string }> {
    const texto = await archivo.text();
    let data: any;
    try {
      data = JSON.parse(texto);
    } catch {
      throw new Error('El archivo no es JSON válido.');
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.productos) || !Array.isArray(data.proveedores)) {
      throw new Error('El archivo no tiene el formato de respaldo LANA.');
    }

    // --- proveedores ---
    const existentesProv = [...this.proveedorStore.proveedores()];
    const provMap = new Map<string, ProveedorCatalogo>();
    for (const p of existentesProv) provMap.set(claveProveedor(p), p);
    let provAgregados = 0;
    for (const inc of data.proveedores as ProveedorCatalogo[]) {
      const k = claveProveedor(inc);
      let ex: ProveedorCatalogo | undefined;
      if (provMap.has(k)) {
        ex = provMap.get(k);
      } else {
        ex = buscarCandidatoProveedorFuzzy(existentesProv, inc) ?? undefined;
      }
      if (ex) {
        const fusionado = fusionarProveedor(ex, inc);
        const idx = existentesProv.findIndex((p) => p.id === ex!.id);
        if (idx >= 0) existentesProv[idx] = fusionado;
        provMap.set(claveProveedor(fusionado), fusionado);
      } else {
        let nuevo = { ...inc };
        if (existentesProv.some((p) => p.id === nuevo.id)) {
          nuevo = { ...nuevo, id: 'imp-' + Math.random().toString(36).slice(2, 10) };
        }
        existentesProv.push(nuevo);
        provMap.set(claveProveedor(nuevo), nuevo);
        provAgregados++;
      }
    }

    // --- productos ---
    const existentesProd = [...this.productoStore.productos()];
    const prodMap = new Map<string, Producto>();
    for (const p of existentesProd) prodMap.set(claveProducto(p), p);
    let prodAgregados = 0;
    for (const inc of data.productos as Producto[]) {
      const k = claveProducto(inc);
      let ex: Producto | undefined;
      if (prodMap.has(k)) {
        ex = prodMap.get(k);
      } else {
        // intento fuzzy: mismo rubro y marca (si aplica) con nombre similar
        ex = buscarCandidatoFuzzy(existentesProd, inc) ?? undefined;
      }
      if (ex) {
        const fusionado = fusionarProducto(ex, inc);
        const idx = existentesProd.findIndex((p) => p.id === ex!.id);
        if (idx >= 0) existentesProd[idx] = fusionado;
        prodMap.set(claveProducto(fusionado), fusionado);
      } else {
        let nuevo = { ...inc };
        if (existentesProd.some((p) => p.id === nuevo.id)) {
          nuevo = { ...nuevo, id: 'imp-' + Math.random().toString(36).slice(2, 10) };
        }
        existentesProd.push(nuevo);
        prodMap.set(claveProducto(nuevo), nuevo);
        prodAgregados++;
      }
    }

    // --- persistir productos y proveedores ---
    try {
      localStorage.setItem(CLAVE_PRODUCTOS_LOCALES, JSON.stringify(existentesProd));
      localStorage.setItem(CLAVE_PROVEEDORES_LOCALES, JSON.stringify(existentesProv));
    } catch {
      throw new Error('No se pudo guardar los datos importados.');
    }

    // --- recargos: fusionar categorías (no sobrescribir valores existentes) ---
    if (data.recargos && typeof data.recargos === 'object' && data.recargos.categorias) {
      const actual = this.recargosStore.config();
      const fusion: Record<string, any> = { ...actual.categorias };
      for (const [cat, val] of Object.entries(data.recargos.categorias)) {
        if (!fusion[cat]) fusion[cat] = val;
      }
      try {
        localStorage.setItem(CLAVE_RECARGOS_LOCAL, JSON.stringify({ categorias: fusion }));
      } catch {
        // ignore
      }
    }

    // --- categorias ---
    if (Array.isArray(data.categorias)) {
      const actual = this.categoriasStore.categorias();
      const fusion = [...new Set([...actual, ...data.categorias.map((c: any) => String(c).trim()).filter(Boolean)])];
      try {
        localStorage.setItem(CLAVE_CATEGORIAS_LOCAL, JSON.stringify(fusion));
      } catch {
        // ignore
      }
    }

    // --- configuracion: solo si no hay capital configurado (no sobrescribir) ---
    if (data.configuracion && typeof data.configuracion === 'object') {
      const actual = this.configStore.configuracion();
      if (actual.capitalDisponible == null && data.configuracion.capitalDisponible != null) {
        try {
          localStorage.setItem(CLAVE_CONFIGURACION_LOCAL, JSON.stringify(data.configuracion));
        } catch {
          // ignore
        }
      }
    }

    // recargar stores
    await this.productoStore.cargar();
    await this.proveedorStore.cargar();
    this.configStore.cargar();
    this.recargosStore.cargar();
    this.categoriasStore.cargar();

    return {
      productos: prodAgregados,
      proveedores: provAgregados,
      mensaje: `Importados ${prodAgregados} productos y ${provAgregados} proveedores nuevos (fusionados sin duplicar).`,
    };
  }
}
