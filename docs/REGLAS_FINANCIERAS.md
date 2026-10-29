# REGLAS_FINANCIERAS.md

## Principios
- No contabilizar costos dos veces.
- Margen sobre ventas != ROI. Ambos deben calcularse.
- Separar costos fijos vs variables.
- Distribuir costos de adquisición entre unidades cuando corresponda (envío proveedor, otros fijos de compra) para obtener costo unitario efectivo de adquisición.
- Algunos costos son montos fijos, otros porcentajes.
- Si falta dato, informar; no inventar.
- Evitar igualdad estricta entre decimales en validaciones.
- Considerar centavos (enteros) o estrategia decimal explícita.
- Las estimaciones no son garantizadas; supuestos deben identificarse.

## Definiciones y fórmulas (MVP)

1. Cantidad a comprar (Q)
2. Precio de compra unitario (PCU)
3. Costos de adquisición asignados a la compra (Adq_total): envío proveedor + otros costos de adquisición atribuibles a la compra. Si hay costos fijos que cubren compra, distribuir entre Q: Adq_unit = Adq_total / Q (cuando Q>0).
4. Costo de adquisición unitario efectivo (CAUE) = PCU + Adq_unit
5. Costos comerciales por venta: comisión marketplace (% o monto), envío al cliente, publicidad por unidad (o distribuir presupuesto), impuestos (% o monto), otros por venta. Tratar como variables por unidad salvo que se indique distribución explícita.
6. Costo variable unitario total (CVU) = CAUE + comision_unit + envio_cliente_unit + publicidad_unit + impuestos_unit + otros_venta_unit
7. Costos fijos (CF) asociados al análisis: solo si explícitos; no duplicar con Adq_total.
8. Inversión total requerida (I_total) = CAUE * Q + CF_no_asignados_a_unidades (o según asignación). Documentar asignación.
9. Precio de venta objetivo/unidad (PVO)
10. Ganancia neta por unidad (GNU) = PVO - CVU
11. Facturación potencial (F) = PVO * Q
12. Costos totales (CT) = CVU * Q + CF
13. Ganancia potencial total (GPT) = F - CT (también puede derivarse GNU*Q - CF). Debe coincidir conceptualmente; evitar doble conteo.
14. Margen neto sobre ventas (%) = (GNU / PVO) * 100 (cuando PVO>0)
15. ROI (%) = (GPT / I_total) * 100 (cuando I_total>0). Diferenciar de margen.
16. Punto de equilibrio (unidades) BEQ = CF / (PVO - CVU) si PVO>CVU>0. Si CVU>=PVO, BEQ indefinido. Indicar.
17. Precio mínimo rentable (PMR) por unidad = CVU + (CF/Q) si se desea cubrir CF distribuyendo, o CVU si solo variables. Documentar supuesto (cubrir CF o solo variables). Nunca inventar CF.
18. Diferencia vs precio mediano mercado (%) = ((PVO - Pm) / Pm)*100 cuando Pm>0.
19. % capital comprometido = (I_total / Capital_disponible)*100 cuando Capital_disponible>0.

## Escenarios
- Conservador: usar supuestos más pesimistas (menor venta, mayores costos, menor precio). Identificar.
- Normal: caso base con datos reales ingresados.
- Optimista: supuestos razonables, no irreales. Identificar.

## Casos límite
- Q<=0, PVO<=0, PCU<0, comisiones negativas inválidas, división por cero, Capital_disponible<=0 al calcular %, datos insuficientes.
- GNU<=0 -> alerta margen insuficiente.
- % capital comprometido alto -> alerta (umbral configurable).
- Precio fuera de rango mercado con pocas observaciones -> advertencia.
- PMR > PVO -> no rentable con supuestos actuales.

## Notas
- No sumar Adq_total dos veces. Si ya incluido en CAUE, no sumar nuevamente a I_total.
- Publicidad: si es presupuesto total, distribuir entre Q: pub_unit = presupuesto/Q cuando Q>0.
- Impuestos: distinguir si monto fijo o % sobre venta/compra según modelo; documentar.
- No asumir que todos son %.
- Comparar costo efectivo por proveedor (precio+envío+otros/compra mínima+reparto).
- Trabajo en centavos recomendado para evitar 0.10+0.20!=0.30.

## Ofertas de proveedor e historial de precios
- Cada proveedor aparece una sola vez por producto. Un cambio de precio se registra como "nuevo precio": el vigente pasa a historial con su rango de vigencia (igenteDesde/igenteHasta).
- El costo de compra del análisis puede tomarse de una oferta (Producto.ofertaCompraId). En ese caso reemplaza precio y envío manuales (no se suman); los otros costos de adquisición siguen siendo manuales.
- Sin oferta elegida se usan los costos manuales (comportamiento previo, sin cambios en los datos guardados).
- Si la oferta elegida se elimina, el producto vuelve a costos manuales y el aviso queda visible en el detalle.

## Comparación visual con el mercado
- La escala de precios muestra el precio propio, la mediana del mercado, el costo por unidad, el mínimo para no perder y el rango observado. Es presentación: no recalcula nada.
- El veredicto (Conviene / Revisar / No conviene / Faltan datos) es una traducción presentacional del análisis ya calculado.

## Tipos de producto y margen sugerido
- Se ofrece un listado de tipos de producto (auriculares, pantallas, celulares, etc.) con un margen sugerido sobre el precio de venta.
- Los porcentajes son SUPUESTOS DE EJEMPLO (ficticios), no datos reales de mercado. La búsqueda pública solo dio un margen bruto de electrónica de 10% a 20%.
- El usuario puede aplicar el margen sugerido o elegir uno de los porcentajes rápidos (10, 15, 20, 25, 30).
- El precio de venta se calcula con el mismo motor financiero (precioVentaParaMargen).
