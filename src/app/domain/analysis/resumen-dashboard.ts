import { CODIGOS_ALERTA } from '../risk/risk-rules';
import { AnalisisProducto } from './analisis-producto';

export interface ItemDashboard {
  id: string;
  nombre: string;
  actualizadoEn: string;
  analisis: AnalisisProducto;
}

export interface ValorDestacado {
  productoId: string;
  nombre: string;
  valor: number;
}

export interface ResumenDashboard {
  totalProductos: number;
  conCalculo: number;
  requierenInvestigacion: number;
  conAlertasRiesgo: number;
  potencialmenteInteresantes: number;
  /**
   * Máximo entre los análisis INDIVIDUALES calculables.
   * Las inversiones de distintos productos son alternativas entre sí:
   * no se suman porque no representan una cartera ejecutable.
   */
  mayorInversionIndividual: ValorDestacado | null;
  mayorGananciaIndividual: ValorDestacado | null;
  actividadReciente: ItemDashboard[];
}

/**
 * Agrega los análisis de productos para el dashboard.
 * Solo produce métricas con definición válida: no suma inversiones
 * alternativas ni presenta un total de cartera inexistente.
 */
export function resumirDashboard(items: ItemDashboard[]): ResumenDashboard {
  const calculables = items.filter((i) => i.analisis.resultado != null);
  const conAlertasRiesgo = items.filter(
    (i) => i.analisis.nivelRiesgo === 'media' || i.analisis.nivelRiesgo === 'alta',
  ).length;
  const potencialmenteInteresantes = items.filter((i) =>
    i.analisis.alertas.some((a) => a.codigo === CODIGOS_ALERTA.oportunidadParaInvestigar),
  ).length;
  const requierenInvestigacion = items.filter((i) => i.analisis.requiereInvestigacion).length;

  let mayorInversion: ValorDestacado | null = null;
  let mayorGanancia: ValorDestacado | null = null;
  for (const item of calculables) {
    const r = item.analisis.resultado;
    if (!r) continue;
    if (mayorInversion == null || r.inversionTotal > mayorInversion.valor) {
      mayorInversion = { productoId: item.id, nombre: item.nombre, valor: r.inversionTotal };
    }
    if (mayorGanancia == null || r.gananciaPotencialTotal > mayorGanancia.valor) {
      mayorGanancia = { productoId: item.id, nombre: item.nombre, valor: r.gananciaPotencialTotal };
    }
  }

  const actividadReciente = [...items]
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn))
    .slice(0, 5);

  return {
    totalProductos: items.length,
    conCalculo: calculables.length,
    requierenInvestigacion,
    conAlertasRiesgo,
    potencialmenteInteresantes,
    mayorInversionIndividual: mayorInversion,
    mayorGananciaIndividual: mayorGanancia,
    actividadReciente,
  };
}
