# REQUISITOS.md

## Clasificación: MVP / Segunda etapa / Tercera etapa

### 1. Dashboard (MVP)
- [MVP] Resumen: capital disponible, productos analizados, alertas, oportunidades potenciales.
- [MVP] Actividad reciente y acciones rápidas (crear análisis, comparar proveedores).
- [MVP] Estado vacío profesional con CTA.
- [MVP] Identificar datos ficticios si se muestran.

### 2. Productos (MVP)
- [MVP] Listado con columnas clave (costo, precio estimado, mercado mediano, margen neto, ROI, inversión requerida, riesgo).
- [MVP] Búsqueda, filtros, ordenamiento, vacío.
- [MVP] Acceso a detalle.
- [Segunda] CRUD completo persistido.
- [Tercera] Importación masiva.

### 3. Proveedores (MVP)
- [MVP] Listado y campos básicos.
- [MVP] Costo efectivo comparable (incluye envío/compra mínima).
- [Segunda] Comparación automática.
- [Tercera] Historial de precios.

### 4. Calculadora financiera (MVP)
- [MVP] Inversión total, costo unitario efectivo, comisiones, costos variables, ganancia neta/unidad, ganancia total, margen neto, ROI, facturación potencial, costos totales, punto de equilibrio, precio mínimo rentable, % capital comprometido.
- [MVP] Tratamiento de casos inválidos, divisiones por cero, datos faltantes.
- [MVP] Separada de presentación.
- [Segunda] Más escenarios y análisis de sensibilidad.

### 5. Análisis del mercado (MVP)
- [MVP] Búsqueda **automática** de precios en fuentes reales y verificables (Mercado Libre) como
  funcionalidad **central**, mediante un backend propio que guarda las credenciales. Los secretos/tokens
  nunca se exponen al frontend.
- [MVP] Carga manual de observaciones (precio, vendedor, URL, marca/modelo, condición, envío, fecha)
  como **alternativa** y respaldo si la fuente no está configurada o no hay resultados utilizables.
- [MVP] La integración informa estado, errores, límites de la fuente y fecha de actualización; nunca
  presenta un vacío o un error como si fuera un precio real.
- [MVP] Mín, máx, media, mediana.
- [MVP] Diferencia vs mediana.
- [MVP] Advertencia si insuficientes observaciones.
- [MVP] No asumir equivalencia por nombre similar.
- [Segunda] Normalización.
- [Tercera] Scraping (descartado por condiciones de uso; se usa la API oficial).

### 6. Comparación de precios (MVP)
- [MVP] Tabla con ganancia neta, margen, ROI, ganancia total, vs mediana.
- [MVP] Recalcula al cambiar supuestos.
- [MVP] Bloquea conclusiones engañosas si datos inválidos/faltantes.

### 7. Simulación de precios (MVP)
- [MVP] Comparar varios precios de venta.
- [MVP] Ver impacto financiero.
- [Segunda] Curvas de rentabilidad.

### 8. Escenarios (MVP)
- [MVP] Conservador, normal, optimista.
- [MVP] Identificar supuestos.
- [MVP] No mostrar garantía.

### 9. Análisis mediante IA (Tercera)
- [Tercera] Arquitectura de interfaz desacoplada.
- [Tercera] No recalcular finanzas. Recibir info estructurada.
- [Tercera] No inventar precios ni sustituir datos de mercado ausentes.
- [Tercera] Cambiar proveedor sin tocar dominio.

### 10. Riesgo de capital (MVP)
- [MVP] Reglas determinísticas (precio fuera mercado, margen insuficiente, capital comprometido elevado, info insuficiente, alternativa mejor).
- [MVP] Umbrales configurables/documentados.
- [MVP] No predicción exacta de velocidad de venta.

### 11. Alertas (MVP)
- [MVP] Listado de alertas justificadas.
- [Segunda] Priorización.

### 12. Capital disponible (MVP)
- [MVP] Configurable.
- [MVP] % comprometido calculado.

### 13. Historial (Segunda)
- [Segunda] Cambios relevantes.

### 14. Ranking de oportunidades (Segunda)
- [Segunda] Ranking con criterios.

### 15. Seguimiento de ventas reales (Tercera)
- [Tercera] Comparar estimado vs real.

Filtros, búsqueda, vacío, responsive, accesibilidad: aplican transversalmente.
