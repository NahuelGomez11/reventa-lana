# BIBLIA.md - Reventa Intelligence

## Visión del producto

"Con estos costos, estos precios de mercado y estos supuestos, ¿qué ocurriría si invertimos nuestro capital en este producto?"

Reventa Intelligence es una herramienta privada para analizar productos antes de comprarlos para reventa online. No basta con comparar precio de compra vs precio de venta: hay que considerar costos reales, mercado, competencia, capital comprometido, riesgo y recuperar la inversión.

## Objetivo

Ayudar a decidir qué productos investigar, cuáles pueden ser rentables y cuáles representan riesgo de inmovilizar dinero. La decisión final siempre es del usuario. Los cálculos deben ser reproducibles y mostrar supuestos y advertencias.

## Requisitos funcionales (alto nivel)

- Dashboard con resumen del capital, productos analizados, alertas, oportunidades y acciones rápidas.
- Gestión de productos analizados con detalle completo.
- Gestión de proveedores y comparación de costo efectivo.
- Calculadora financiera con fórmulas documentadas.
- Análisis de mercado: **búsqueda automática de precios** en fuentes reales (Mercado Libre, vía backend
  propio) como funcionalidad central, con carga manual de observaciones como alternativa.
- Comparación y simulación de precios.
- Escenarios (conservador, normal, optimista).
- Arquitectura preparada para análisis con IA (sin integración activa).
- Riesgo y alertas basados en reglas.
- Capital disponible y seguimiento de análisis.
- Historial y ranking de oportunidades.
- Preparación para seguimiento de ventas reales (futuro).

## Reglas de negocio (principales)

- No contabilizar costos dos veces.
- Diferenciar margen sobre ventas vs ROI.
- Costos fijos vs variables. Distribuir costos de adquisición entre unidades cuando aplica.
- Cuando un cálculo depende de supuestos, deben identificarse.
- La estimación no es garantía.
- No asumir equivalencia de productos solo por nombre similar.
- Los datos ficticios deben identificarse claramente. No pasar datos locales por reales.
- Las publicaciones de mercado deben proceder de fuentes reales y verificables; la integración debe
  informar errores, límites y fecha de actualización.
- Los cálculos financieros son determinísticos: no se modifican con datos de mercado ni por IA.
- La IA no debe recalcular resultados financieros, inventar precios ni sustituir datos de mercado
  ausentes.
- Los secretos y tokens de Mercado Libre nunca se exponen al frontend.
- No conectar servicios externos sin configuración real.

## Arquitectura prevista

- Frontend: Angular (standalone), TypeScript estricto, Tailwind CSS.
- Estado reactivo: Signals cuando aporten valor.
- Backend de integración de mercado: NestJS + Node.js (separado del frontend). Guarda las credenciales
  de Mercado Libre y expone un contrato propio. Sustituye a la fuente nula cuando está configurado.
- Backend futuro (datos): NestJS + Node.js.
- Persistencia futura: MySQL + Prisma.
- Auth futuro: Firebase Auth.
- IA futura: proveedor intercambiable detrás de interfaz propia.
- Separación: presentación, dominio, acceso a datos, integraciones.
- PWA futuro, pruebas, seguridad, gestión de secretos.

## Restricciones técnicas

- No implementar otras integraciones externas activas ahora (auth de usuarios, DB, IA, scraping). La
  búsqueda de precios de mercado es la única integración activa prevista, y siempre mediante un backend
  propio que resguarda los secretos.
- Usar adaptadores de demostración desacoplados cuando falten datos.
- Precisión financiera: evitar igualdad estricta entre decimales. Considerar trabajar en centavos o estrategia explícita.
- Validar divisiones por cero, valores negativos, datos faltantes.
- No guardar secretos en repo. Config por entornos sin secretos.
- Preservar código existente; no sobrescribir archivos importantes.
- Solo commits remotos si explícitamente solicitado.

## Plan inicial (sin detallar implementación completa)

Ver `docs/PLAN_DESARROLLO.md`. Priorizar base Angular, diseño visual, navegación, motor financiero básico y pantallas MVP.
