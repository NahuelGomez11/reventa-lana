import { UmbralesRiesgo } from '../../core/models/configuracion.model';
import { ResultadoFinanciero } from '../financial/financial.service';
import { diferenciaPorcentualVsMediana, EstadisticasMercado } from '../market/market-stats';
import { ComparacionProveedores } from '../providers/comparacion-proveedores';

export type Severidad = 'alta' | 'media' | 'baja';

export interface Alerta {
  codigo: string;
  severidad: Severidad;
  titulo: string;
  /** Razón concreta y verificable de la alerta. */
  detalle: string;
}

export interface InputRiesgo {
  precioVentaObjetivo: number | null;
  precioMinimoAceptable: number | null;
  resultado: ResultadoFinanciero | null;
  faltantes: string[];
  estadisticas: EstadisticasMercado;
  comparacion: ComparacionProveedores | null;
  umbrales: UmbralesRiesgo;
}

export const CODIGOS_ALERTA = {
  datosIncompletos: 'DATOS_INCOMPLETOS',
  margenInsuficiente: 'MARGEN_INSUFICIENTE',
  capitalComprometido: 'CAPITAL_COMPROMETIDO_ALTO',
  precioFueraDeMercado: 'PRECIO_FUERA_DE_MERCADO',
  mercadoInsuficiente: 'INFO_MERCADO_INSUFICIENTE',
  proveedorAlternativaMasBarata: 'PROVEEDOR_ALTERNATIVA_MAS_BARATA',
  puntoEquilibrioNoAlcanzado: 'PUNTO_EQUILIBRIO_NO_ALCANZADO',
  precioBajoMinimoAceptable: 'PRECIO_BAJO_MINIMO_ACEPTABLE',
  capitalSinInformar: 'CAPITAL_SIN_INFORMAR',
  oportunidadParaInvestigar: 'OPORTUNIDAD_A_INVESTIGAR',
} as const;

/**
 * Reglas determinísticas de riesgo. No estiman probabilidades de venta
 * ni rotación: solo comparan los datos ingresados con umbrales configurables.
 */
export function evaluarRiesgo(input: InputRiesgo): Alerta[] {
  const alertas: Alerta[] = [];
  const { umbrales, resultado, estadisticas } = input;

  if (input.faltantes.length > 0) {
    alertas.push({
      codigo: CODIGOS_ALERTA.datosIncompletos,
      severidad: 'alta',
      titulo: 'Datos incompletos',
      detalle: `No se puede evaluar la rentabilidad porque faltan: ${input.faltantes.join(', ')}.`,
    });
  }

  if (input.precioMinimoAceptable != null && input.precioVentaObjetivo != null) {
    if (input.precioVentaObjetivo < input.precioMinimoAceptable) {
      alertas.push({
        codigo: CODIGOS_ALERTA.precioBajoMinimoAceptable,
        severidad: 'alta',
        titulo: 'Precio objetivo por debajo del mínimo aceptable',
        detalle: `El precio de venta objetivo (${input.precioVentaObjetivo}) es menor al precio mínimo aceptable informado (${input.precioMinimoAceptable}).`,
      });
    }
  }

  if (resultado) {
    if (resultado.margenNetoSobreVentas < umbrales.margenMinimoPct) {
      alertas.push({
        codigo: CODIGOS_ALERTA.margenInsuficiente,
        severidad: resultado.margenNetoSobreVentas <= 0 ? 'alta' : 'media',
        titulo: 'Margen insuficiente',
        detalle: `Margen neto ${resultado.margenNetoSobreVentas.toFixed(1)}% ${resultado.margenNetoSobreVentas <= 0 ? '(sin beneficio por unidad)' : ''} frente al umbral configurado de ${umbrales.margenMinimoPct}%.`,
      });
    }

    if (
      resultado.porcentajeCapitalComprometido != null &&
      resultado.porcentajeCapitalComprometido > umbrales.capitalComprometidoMaxPct
    ) {
      alertas.push({
        codigo: CODIGOS_ALERTA.capitalComprometido,
        severidad: 'media',
        titulo: 'Capital comprometido elevado',
        detalle: `La inversión requerida compromete ${resultado.porcentajeCapitalComprometido.toFixed(1)}% del capital disponible, por encima del umbral de ${umbrales.capitalComprometidoMaxPct}%.`,
      });
    }

    if (resultado.porcentajeCapitalComprometido == null) {
      alertas.push({
        codigo: CODIGOS_ALERTA.capitalSinInformar,
        severidad: 'media',
        titulo: 'Capital disponible sin informar',
        detalle: 'Sin capital disponible no se puede calcular el porcentaje comprometido ni evaluar el riesgo de capital.',
      });
    }

    if (
      resultado.puntoEquilibrioUnidades != null &&
      resultado.puntoEquilibrioUnidades > resultado.cantidad
    ) {
      alertas.push({
        codigo: CODIGOS_ALERTA.puntoEquilibrioNoAlcanzado,
        severidad: 'alta',
        titulo: 'Punto de equilibrio no alcanzado con la cantidad planificada',
        detalle: `Se necesitan ${Math.ceil(resultado.puntoEquilibrioUnidades)} unidades para cubrir costos fijos, pero se planean comprar ${resultado.cantidad}.`,
      });
    }
  }

  const diferencia = diferenciaPorcentualVsMediana(
    input.precioVentaObjetivo,
    estadisticas.mediana,
  );
  if (diferencia != null && Math.abs(diferencia) > umbrales.desviacionPrecioMercadoPct) {
    const porEncima = diferencia > 0;
    alertas.push({
      codigo: CODIGOS_ALERTA.precioFueraDeMercado,
      severidad: porEncima ? 'media' : 'baja',
      titulo: porEncima ? 'Precio por encima del mercado' : 'Precio por debajo del mercado',
      detalle: `El precio propio está ${Math.abs(diferencia).toFixed(1)}% ${porEncima ? 'por encima' : 'por debajo'} de la mediana observada (${estadisticas.mediana}), con un umbral de ${umbrales.desviacionPrecioMercadoPct}%. Basado en ${estadisticas.cantidad} observación(es).`,
    });
  }

  if (!estadisticas.suficiente) {
    alertas.push({
      codigo: CODIGOS_ALERTA.mercadoInsuficiente,
      severidad: 'media',
      titulo: 'Información de mercado insuficiente',
      detalle: `Hay ${estadisticas.cantidad} observación(es) válida(s) y el umbral configurado es ${umbrales.minObservacionesMercado}. Requiere investigación antes de decidir.`,
    });
  }

  if (resultado && input.comparacion) {
    const mejor = input.comparacion.evaluaciones.find(
      (e) => e.id === input.comparacion?.mejorId && e.costoEfectivoUnitario != null,
    );
    if (
      mejor &&
      mejor.costoEfectivoUnitario != null &&
      resultado.costoAdquisicionUnitarioEfectivo - mejor.costoEfectivoUnitario >
        resultado.costoAdquisicionUnitarioEfectivo * 0.005
    ) {
      alertas.push({
        codigo: CODIGOS_ALERTA.proveedorAlternativaMasBarata,
        severidad: 'baja',
        titulo: 'Existe alternativa de proveedor más económica',
        detalle: `El proveedor "${mejor.nombre}" tiene un costo efectivo de ${mejor.costoEfectivoUnitario.toFixed(2)} frente a ${resultado.costoAdquisicionUnitarioEfectivo.toFixed(2)} del análisis actual (diferencia de ${(resultado.costoAdquisicionUnitarioEfectivo - mejor.costoEfectivoUnitario).toFixed(2)} por unidad).`,
      });
    }
  }

  const sinAlertasAltas = !alertas.some((a) => a.severidad === 'alta');
  // Capital comprometido debe conocerse para considerar una oportunidad.
  const capitalOk =
    resultado?.porcentajeCapitalComprometido != null &&
    resultado.porcentajeCapitalComprometido <= umbrales.capitalComprometidoMaxPct;
  const margenOk = resultado != null && resultado.margenNetoSobreVentas >= umbrales.margenMinimoPct;
  const roiOk = resultado != null && resultado.roi >= umbrales.margenMinimoPct;
  const mercadoOk = estadisticas.suficiente && diferencia != null && diferencia <= umbrales.desviacionPrecioMercadoPct;

  if (sinAlertasAltas && capitalOk && margenOk && roiOk && mercadoOk && resultado) {
    alertas.push({
      codigo: CODIGOS_ALERTA.oportunidadParaInvestigar,
      severidad: 'baja',
      titulo: 'Posible oportunidad para investigar',
      detalle: `Cumple los umbrales configurados: margen ${resultado.margenNetoSobreVentas.toFixed(1)}%, ROI ${resultado.roi.toFixed(1)}%, mercado con ${estadisticas.cantidad} observación(es) y precio a ${diferencia?.toFixed(1)}% de la mediana. No es una predicción de venta: verificar demanda y rotación con datos reales.`,
    });
  }

  return alertas;
}

export function severidadMaxima(alertas: Alerta[]): Severidad | null {
  const orden: Severidad[] = ['baja', 'media', 'alta'];
  let max: Severidad | null = null;
  for (const a of alertas) {
    if (max == null || orden.indexOf(a.severidad) > orden.indexOf(max)) {
      max = a.severidad;
    }
  }
  return max;
}
