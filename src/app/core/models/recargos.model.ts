export type GamaProducto = 'baja' | 'media' | 'alta';

export interface RecargoGama {
  baja: number;
  media: number;
  alta: number;
}

export interface RecargosConfig {
  /** Porcentaje de recargo por categoría y gama. */
  categorias: Record<string, RecargoGama>;
}

/** Valores iniciales orientativos (margen sugerido por categoría y gama). No son reglas universales. */
export const RECARGOS_DEFECTO: RecargosConfig = {
  categorias: {
    'Celulares': { baja: 12, media: 10, alta: 8 },
    'Notebooks': { baja: 12, media: 10, alta: 8 },
    'Computadoras de escritorio': { baja: 15, media: 12, alta: 10 },
    'Procesadores': { baja: 12, media: 10, alta: 8 },
    'Placas de video': { baja: 12, media: 10, alta: 8 },
    'Placas madre': { baja: 15, media: 12, alta: 10 },
    'Memoria RAM': { baja: 15, media: 12, alta: 10 },
    'Almacenamiento': { baja: 20, media: 15, alta: 12 },
    'Fuentes de alimentación': { baja: 15, media: 12, alta: 10 },
    'Gabinetes y refrigeración': { baja: 20, media: 15, alta: 12 },
    'Monitores': { baja: 15, media: 12, alta: 10 },
    'Tablets y lectores': { baja: 15, media: 12, alta: 10 },
    'Consolas y videojuegos': { baja: 12, media: 10, alta: 8 },
    'Periféricos': { baja: 30, media: 25, alta: 20 },
    'Auriculares': { baja: 30, media: 25, alta: 20 },
    'Parlantes y audio': { baja: 25, media: 20, alta: 15 },
    'Micrófonos y streaming': { baja: 25, media: 20, alta: 15 },
    'Cargadores y fuentes': { baja: 35, media: 30, alta: 25 },
    'Cables y adaptadores': { baja: 40, media: 35, alta: 30 },
    'Fundas y protectores': { baja: 50, media: 45, alta: 35 },
    'Baterías y power banks': { baja: 30, media: 25, alta: 20 },
    'Redes y conectividad': { baja: 20, media: 15, alta: 12 },
    'Smartwatches y wearables': { baja: 25, media: 20, alta: 15 },
    'Smart home': { baja: 30, media: 25, alta: 20 },
    'Impresoras y escáneres': { baja: 15, media: 12, alta: 10 },
    'Tintas y consumibles': { baja: 25, media: 20, alta: 15 },
    'Fotografía y video': { baja: 20, media: 15, alta: 12 },
    'Accesorios gaming': { baja: 30, media: 25, alta: 20 },
    'Herramientas tecnológicas': { baja: 30, media: 25, alta: 20 },
    'Otros gadgets': { baja: 30, media: 25, alta: 20 },
  },
};

export const GAMAS: GamaProducto[] = ['baja', 'media', 'alta'];

export function etiquetaGama(g: GamaProducto): string {
  return g === 'baja' ? 'Baja' : g === 'media' ? 'Media' : 'Alta';
}
