import { DatosAnalisis } from '../../core/models/analisis.model';
import { UmbralesRiesgo } from '../../core/models/configuracion.model';
import { Producto } from '../../core/models/producto.model';
import { ConstruccionAnalisis, construirAnalisisInput } from '../financial/construir-analisis';
import { calcularFinanzas, ResultadoFinanciero } from '../financial/financial.service';
import {
  calcularEstadisticasMercado,
  diferenciaPorcentualVsMediana,
  EstadisticasMercado,
} from '../market/market-stats';
import { compararProveedores, ComparacionProveedores } from '../providers/comparacion-proveedores';
import { FuenteCompra, resolverFuenteCompra } from '../providers/ofertas';
import { Alerta, CODIGOS_ALERTA, evaluarRiesgo, severidadMaxima, Severidad } from '../risk/risk-rules';

export interface AnalisisProducto {
  construccion: ConstruccionAnalisis;
  resultado: ResultadoFinanciero | null;
  estadisticas: EstadisticasMercado;
  comparacion: ComparacionProveedores;
  diferenciaVsMedianaPct: number | null;
  alertas: Alerta[];
  nivelRiesgo: Severidad | null;
  requiereInvestigacion: boolean;
  /** Origen del costo de compra usado en el cálculo (manual u oferta de proveedor). */
  fuenteCompra: FuenteCompra;
  /** Datos efectivos usados para el cálculo (costos de compra ya resueltos). */
  datosEfectivos: DatosAnalisis;
  advertenciasCompra: string[];
}

/**
 * Ejecuta todo el análisis de un producto con funciones puras de dominio.
 * `capitalGlobal` es el capital de la configuración y solo se usa si el
 * producto no define el suyo.
 */
export function analizarProducto(
  producto: Producto,
  umbrales: UmbralesRiesgo,
  capitalGlobal: number | null = null,
): AnalisisProducto {
  const compra = resolverFuenteCompra(
    producto.datos,
    producto.proveedores,
    producto.ofertaCompraId,
    producto.datos.cantidad,
  );
  const datos: DatosAnalisis = {
    ...compra.datos,
    capitalDisponible: producto.datos.capitalDisponible ?? capitalGlobal,
  };

  const construccion = construirAnalisisInput(datos);
  const resultado = construccion.ok ? calcularFinanzas(construccion.input) : null;

  const estadisticas = calcularEstadisticasMercado(
    producto.observaciones.map((o) => o.precio),
    umbrales.minObservacionesMercado,
  );

  const comparacion = compararProveedores(
    producto.proveedores,
    datos.cantidad,
    datos.costosCompra.otrosCostosAdquisicion,
  );

  const alertas = evaluarRiesgo({
    precioVentaObjetivo: datos.costosVenta.precioVentaObjetivo,
    precioMinimoAceptable: producto.precioMinimoAceptable,
    resultado,
    faltantes: construccion.ok ? [] : construccion.faltantes,
    estadisticas,
    comparacion,
    umbrales,
  });

  const nivel = severidadMaxima(alertas);

  return {
    construccion,
    resultado,
    estadisticas,
    comparacion,
    diferenciaVsMedianaPct: diferenciaPorcentualVsMediana(
      datos.costosVenta.precioVentaObjetivo,
      estadisticas.mediana,
    ),
    alertas,
    nivelRiesgo: nivel,
    requiereInvestigacion: alertas.some(
      (a) =>
        a.codigo === CODIGOS_ALERTA.datosIncompletos ||
        a.codigo === CODIGOS_ALERTA.mercadoInsuficiente,
    ),
    fuenteCompra: compra.fuente,
    datosEfectivos: datos,
    advertenciasCompra: compra.advertencias,
  };
}
