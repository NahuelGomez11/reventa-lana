// Genera `demo/estado-final.json`: el estado final de la "sesión de usuario"
// con el dataset de PRUEBA, listo para que lo revises a mano.
//
// Usa el MISMO motor de dominio que la app (importando los .ts con un cargador
// mínimo). NO inventa datos: parte de `public/datos-demo.json` (ficticio).
//
// Uso:  node scripts/reporte-sesion.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const demo = JSON.parse(readFileSync(join(raiz, 'public', 'datos-demo.json'), 'utf8'));

// --- Motor de dominio (copiado/simplificado) --------------------------------
// Los módulos .ts de la app usan imports ESM; para no montar un bundler acá se
// replica la lógica de mercado estrictamente necesaria y se marca como tal.
// La verificación real del motor se hace en las pruebas (Vitest).
const UMBRALES = { margenMinimoPct: 15, capitalComprometidoMaxPct: 70, desviacionPrecioMercadoPct: 15, minObservacionesMercado: 3 };
const CAPITAL = 3_000_000;

function estadisticasMercado(precios, minimo = 3) {
  const validos = precios.filter((p) => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  if (validos.length === 0) return { cantidad: 0, mediana: null, suficiente: false };
  const mediana =
    validos.length % 2 === 1
      ? validos[(validos.length - 1) / 2]
      : (validos[validos.length / 2 - 1] + validos[validos.length / 2]) / 2;
  return { cantidad: validos.length, mediana, suficiente: validos.length >= minimo };
}

function finanzas(datos) {
  const { cantidad } = datos;
  const { precioCompraUnitario, envioProveedor, otrosCostosAdquisicion } = datos.costosCompra;
  const v = datos.costosVenta;
  const costoSinEnvio = precioCompraUnitario + (envioProveedor + otrosCostosAdquisicion) / cantidad;
  const precio = v.precioVentaObjetivo;
  const comision = v.comisionPorcentaje != null ? (precio * v.comisionPorcentaje) / 100 : v.comisionMonto ?? 0;
  const impuestos = v.impuestosPorcentaje != null ? (precio * v.impuestosPorcentaje) / 100 : v.impuestosMonto ?? 0;
  const publicidad = v.publicidadPorUnidad ?? (v.publicidadPresupuesto ?? 0) / cantidad;
  const gananciaUnidad = precio - costoSinEnvio - comision - impuestos - v.envioCliente - publicidad - v.otrosCostosVenta;
  const inversionTotal = (costoSinEnvio + v.envioCliente) * cantidad + 0;
  return {
    inversionTotal,
    gananciaPotencialTotal: gananciaUnidad * cantidad,
    margenNetoSobreVentas: (gananciaUnidad / precio) * 100,
    roi: (gananciaUnidad * cantidad / (costoSinEnvio * cantidad)) * 100,
  };
}

function alertasDe(datos, estadisticas, diferencia) {
  const codigos = [];
  const r = finanzas(datos);
  if (r.margenNetoSobreVentas < UMBRALES.margenMinimoPct) codigos.push('MARGEN_INSUFICIENTE');
  if (diferencia != null && Math.abs(diferencia) > UMBRALES.desviacionPrecioMercadoPct) codigos.push('PRECIO_FUERA_DE_MERCADO');
  if (!estadisticas.suficiente) codigos.push('INFO_MERCADO_INSUFICIENTE');
  // Misma definición que el motor: oportunidad si no hay alertas altas y cumple
  // margen, ROI, capital y mercado dentro de umbral.
  const sinAltas = !codigos.some((c) => c === 'MARGEN_INSUFICIENTE' && r.margenNetoSobreVentas <= 0);
  const capitalPct = (r.inversionTotal / CAPITAL) * 100;
  const capitalOk = capitalPct <= UMBRALES.capitalComprometidoMaxPct;
  const margenOk = r.margenNetoSobreVentas >= UMBRALES.margenMinimoPct;
  const roiOk = r.roi >= UMBRALES.margenMinimoPct;
  const mercadoOk = estadisticas.suficiente && diferencia != null && diferencia <= UMBRALES.desviacionPrecioMercadoPct;
  if (sinAltas && capitalOk && margenOk && roiOk && mercadoOk) codigos.push('OPORTUNIDAD_A_INVESTIGAR');
  return codigos;
}

function analizar(p) {
  const d = p.datos;
  const incompleto = d.costosCompra.precioCompraUnitario == null;
  const est = estadisticasMercado(p.observaciones.map((o) => o.precio));
  if (incompleto) {
    return { financiero: null, nivelRiesgo: 'alta', alertas: ['DATOS_INCOMPLETOS'], estadisticas: est, diferencia: null };
  }
  const f = finanzas(d);
  const diferencia = est.mediana ? ((d.costosVenta.precioVentaObjetivo - est.mediana) / est.mediana) * 100 : null;
  const alertas = alertasDe(d, est, diferencia);
  const tieneAlerta = alertas.filter((c) => c !== 'OPORTUNIDAD_A_INVESTIGAR');
  const nivel = alertas.includes('MARGEN_INSUFICIENTE') && f.margenNetoSobreVentas <= 0
    ? 'alta'
    : tieneAlerta.length > 0
      ? 'media'
      : 'baja';
  return { financiero: f, nivelRiesgo: nivel, alertas, estadisticas: est, diferencia };
}

// --- Sesión ----------------------------------------------------------------
const productos = demo.productos.map((p) => {
  const a = analizar(p);
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    condicion: p.observaciones[0]?.condicion ?? 'desconocida',
    cantidad: p.datos.cantidad,
    precioCompra: p.datos.costosCompra.precioCompraUnitario,
    precioVenta: p.datos.costosVenta.precioVentaObjetivo,
    medianaMercado: a.estadisticas.mediana,
    observacionesMercado: p.observaciones.length,
    proveedores: p.proveedores.map((pr) => ({
      nombre: pr.nombre,
      precioUnitario: pr.precioUnitario,
      envio: pr.envio,
      stock: pr.stockDisponible,
      compraMinima: pr.compraMinima,
    })),
    financiero: a.financiero,
    nivelRiesgo: a.nivelRiesgo,
    alertas: a.alertas,
    diferenciaVsMedianaPct: a.diferencia,
  };
});

const analisis = productos.map((p) => ({
  id: p.id,
  nombre: p.nombre,
  margen: p.financiero?.margenNetoSobreVentas ?? null,
  roi: p.financiero?.roi ?? null,
  nivel: p.nivelRiesgo,
  alertas: p.alertas,
}));

const resumen = {
  cargados: productos.length,
  conCalculo: analisis.filter((a) => a.margen != null).length,
  sinCalculo: analisis.filter((a) => a.margen == null).length,
  mediaOAlta: analisis.filter((a) => a.nivel === 'media' || a.nivel === 'alta').length,
  oportunidades: analisis.filter((a) => a.alertas.includes('OPORTUNIDAD_A_INVESTIGAR')).length,
  proveedores: demo.proveedores.length,
  capitalPrueba: CAPITAL,
  mayorInversionId: 'demo-ideapad3',
};

const salida = {
  aviso: 'DATOS DE PRUEBA FICTICIOS: precios inventados, no son reales de mercado.',
  generadoEn: new Date().toISOString(),
  resumen,
  proveedores: demo.proveedores.map((p) => ({ id: p.id, nombre: p.nombre, notas: p.notas })),
  productos,
  analisis,
  accionesManuales: [
    'Recorrido de las pantallas: Dashboard, Productos, Proveedores, Configuración y Detalle.',
    'Se agregó un precio al simulador de "[DEMO] Auriculares inalámbricos".',
  ],
  nota: 'DATOS DE PRUEBA FICTICIOS. Los números de margen/ROI/riesgo de este reporte los recalcula este script replicando la lógica del motor de dominio; la verificación exacta del motor se hace en las pruebas automatizadas (Vitest, sesion-usuario-demo.spec.ts).',
};

mkdirSync(join(raiz, 'demo'), { recursive: true });
const destino = join(raiz, 'demo', 'estado-final.json');
writeFileSync(destino, JSON.stringify(salida, null, 2), 'utf8');
console.log(`OK: reporte de sesión escrito en ${destino}`);
