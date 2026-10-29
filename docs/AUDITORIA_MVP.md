# AUDITORÍA FUNCIONAL DEL MVP - Reventa Intelligence

Fecha: 2026-10-16
Alcance: verificación de extremo a extremo del MVP, coherencia financiera con
`docs/REGLAS_FINANCIERAS.md`, casos límite, riesgo comercial y corrección de errores reales.
Sin desarrollo de módulos nuevos.

## 1. Método y honestidad de las pruebas

- **Estática**: lectura completa de dominio, datos, componentes, plantillas, rutas y specs.
- **Automatizada**: `.\node_modules\.bin\ng test --no-watch` (Vitest + jsdom + Angular TestBed).
- **Compilación**: `.\node_modules\.bin\ng build --configuration production`.
- **Manual en navegador real: NO ejecutada.** Este entorno no dispone de herramienta de navegador.
  Lo verificado como "Automatizada (jsdom)" corre en TestBed/jsdom, no en un navegador real.
  Los pasos manuales para el usuario están en la sección 9.

No se borraron datos, no se limpió `localStorage` de usuario y no se ejecutó ninguna migración.

## 2. Línea base

- Git: repositorio sin commits todavía (todo "untracked"). No se descartó ni sobrescribió trabajo.
- Tests antes de la auditoría: **111 en 19 archivos**, en verde.
- Build de producción antes: OK (único warning: `@import` Sass deprecado de Tailwind v4).

## 3. Pruebas funcionales de extremo a extremo

Leyenda: **A** = Automatizada (jsdom/TestBed) · **E** = Estática · **M** = Manual pendiente.

| Caso | Tipo | Resultado | Evidencia |
|------|------|-----------|-----------|
| Crear producto válido y navegar al detalle | A | OK | `producto-form.component.spec.ts` "guarda un producto completo y navega al detalle" |
| Crear con datos inválidos (faltantes) | A | OK | "no guarda si faltan datos obligatorios…" |
| Crear con un costo requerido por el dominio vaciado | A | Corregido | Nueva prueba "no guarda si se vacía un costo..." (ver error #1) |
| Controles condicionales (comisión/impuestos/publicidad por modo) | A | OK | "exige el control de comisión/impuestos/publicidad según el modo elegido" |
| Consultar la lista | A | OK | `productos.component.spec.ts` (4) |
| Abrir el detalle correcto | A | OK | `detalle-producto.component.spec.ts` |
| Editar producto | A | OK | form spec "carga los datos existentes en modo edición" |
| Recargar y comprobar persistencia | A/E | Parcial | Adaptador serializa/deserializa (spec). Recarga real de navegador: **M** |
| Asociar varios proveedores | A | OK | detalle: "guarda proveedores y marca el de mejor costo efectivo" |
| Comparar proveedores con distintos costos y mínimos | A | OK | `comparacion-proveedores.spec.ts` (8) + `proveedores.component.spec.ts` |
| Agregar/editar observaciones de mercado | A | Parcial | Alta y persistencia probadas (detalle). "Editar/quitar" observación: cubierto por lógica del editor, sin test de UI dedicado. |
| Mínimo, máximo, media y mediana | A | OK | `market-stats.spec.ts` (7), incluye par/impar |
| Simulador de precios | A | OK | `simulacion.spec.ts` (6) |
| Alertas de riesgo | A | OK | `risk-rules.spec.ts` (12) |
| Cambiar capital y umbrales | A | OK | `configuracion.component.spec.ts` (4) |
| Dashboard se actualiza | A | OK | `dashboard.component.spec.ts` (3) + `resumen-dashboard.spec.ts` (4) |
| Eliminar producto | A | OK | `productos.component.spec.ts` (confirmación) + detalle (elimina) |
| URL de detalle inexistente | A | OK | detalle "estado vacío si no existe"; form "producto a editar no existe" |
| Estados vacíos | A | OK | productos / proveedores / dashboard con listas vacías |
| Errores de almacenamiento (lectura/escritura/no disponible/dañado/incompatible) | A | OK | `producto-repositorio-local.spec.ts` (15) + `producto-store.service.spec.ts` (6) |
| Cargar dashboard/listado con datos locales incompatibles sin romper | A | OK | `dashboard.component.spec.ts` "no falla al cargar con datos locales incompatibles…" |

## 4. Auditoría financiera (doc vs implementación)

Todas las fórmulas viven en `src/app/domain/financial/financial.service.ts` (única fuente). La UI no
recalcula.

| Concepto | Regla documentada | Implementación | Veredicto |
|----------|-------------------|----------------|-----------|
| Costo de adquisición unitario efectivo (CAUE) | PCU + Adq_total/Q | `precioCompraUnitario + (envioProveedor+otros)/Q` (Q>0) | Correcto |
| Comisión / impuestos | monto fijo o % según modo | Monto tiene prioridad sobre %; el modo en que no se carga queda `undefined` y se ignora | Correcto, sin doble conteo |
| Base de % de comisión/impuestos | sobre precio de venta | `PVO * pct / 100` | Correcto y documentado como supuesto |
| Publicidad | por unidad o presupuesto distribuido | `publicidadPorUnidad` o `presupuesto/Q` | Correcto |
| CVU | CAUE + comisión + envío cliente + publicidad + impuestos + otros venta | idéntico | Correcto |
| Inversión inicial | CAUE*Q + CF | `caue*Q + cf`; `caue*Q = PCU*Q + Adq_total` (una sola vez) | Correcto |
| Ganancia neta/unidad | PVO - CVU | idéntico | Correcto |
| Costos totales | CVU*Q + CF | idéntico | Correcto |
| Ganancia potencial total | F - CT = GNU*Q - CF | idéntico | Correcto |
| Margen neto sobre ventas | GNU/PVO | idéntico (PVO>0) | Correcto |
| ROI | GPT / I_total | idéntico (I_total>0) | Correcto |
| Punto de equilibrio (BEQ) | CF/(PVO-CVU) | idéntico; `null` si PVO<=CVU | Correcto |
| Precio mínimo rentable (PMR) | CVU + CF/Q | idéntico; `null` si Q<=0 | Correcto |
| Capital comprometido | I_total/capital | idéntico; `null` si capital<=0 | Correcto |

**Doble conteo**: revisado. `Adq_total` entra una sola vez (dentro de CAUE); `CF` se suma en inversión
y en costos totales (conceptos distintos: capital desplegado vs costo), sin duplicar adquisición.
**BEQ vs PMR vs recupero de desembolso**: son tres cosas distintas y no se mezclan.

Hallazgo relevante (no es error de fórmula): **no hay campo de costos fijos en la UI**. En la app,
`CF = 0` siempre, por lo que el punto de equilibrio muestra 0 y PMR = CVU. El motor sí soporta CF y
está probado. Se documenta como limitación / trabajo pendiente (sección 8).

## 5. Casos límite (automatizados)

| Caso | Resultado |
|------|-----------|
| Cantidad 0 y negativa | Advierte; no reparte negativo; PMR/BEQ null; sin NaN |
| Precio de compra 0 | Válido (no negativo); CAUE coherente |
| Precio de venta 0 | Advierte; margen no calculado; BEQ null |
| Capital sin informar / 0 | `% comprometido` null; supuesto explícito; sin oportunidad |
| Margen exactamente 0 | GNU 0, margen 0, BEQ indefinido |
| Margen negativo | Advierte "Margen insuficiente"; ROI negativo coherente |
| Valores muy pequeños (0,01) | Conserva centavos; margen/ROI correctos |
| Valores grandes (1e9 x 1000) | Sin desbordes; ROI correcto |
| Sin observaciones / una / par / impar | Mín/máx/media/mediana correctos; "insuficiente" correcto |
| Proveedores incompletos | No comparables, con motivo (compra mínima/stock) |
| Costos de adquisición compartidos | Repartidos por Q; una sola vez |
| Error de lectura/escritura localStorage | Error tipificado, sin crash; no sobrescribe |
| Datos malformados (JSON inválido o no-array) | Error de lectura controlado; sin crash (corregido) |
| Registro sin `datos`/`costosCompra`/`costosVenta` | Rechazado; error controlado; sin crash (corregido) |
| Arreglo con elemento no-objeto (`observaciones: [null]`) | Rechazado; sin crash en detalle/dashboard (corregido) |
| Registro sin `datos`, `costosCompra`, `costosVenta` u otras estructuras obligatorias | Rechazado (lectura), sin sobrescribir |
| Elemento de `proveedores`/`observaciones` no-objeto; `simulacionPrecios` no numérico | Rechazado; `localStorage` intacto |
| Válidos mezclados con uno incompatible | Se rechaza TODA la lectura (todo-o-nada) y se conserva el original |
| Lectura fallida seguida de crear/eliminar | No hay escritura: los datos originales quedan intactos |

## 6. Riesgo comercial

- Cada alerta tiene causa verificable (detalle con el dato que la origina). ✔
- Un margen alto no oculta un precio fuera de mercado: la alerta `PRECIO_FUERA_DE_MERCADO` se evalúa
  independientemente del margen. ✔
- Mercado desconocido no se presenta como oportunidad: `OPORTUNIDAD_A_INVESTIGAR` exige observaciones
  suficientes y precio dentro de rango. ✔
- El capital comprometido se calcula sobre supuestos explícitos (`supuestos` del motor). ✔
- No hay probabilidades de venta, rotación ni predicción de demanda. ✔

## 7. Errores encontrados y correcciones

### 2) Datos locales incompatibles rompían el render (REAL, crash)
En `ProductoRepositorioLocal` el contenido leído de `localStorage` se entregaba sin verificar su
forma. Un arreglo JSON válido con un registro incompleto (p. ej. `[{"id":"x","nombre":"sin datos"}]`)
se devolvía como `Producto[]` y, al renderizar, `analizarProducto` accedía a `producto.datos…`
(TypeError) y rompía el detalle y el dashboard.
Corrección (causa raíz = falta de validación de forma al leer): se agregaron `esRegistro`,
`esObjetoPlano` y `esProductoValido` y `leer()` valida:
- JSON inválido → error de lectura;
- contenido que no es arreglo → error de lectura;
- `id`/`nombre`/`actualizadoEn` presentes y con tipo correcto;
- `datos`, `datos.costosCompra`, `datos.costosVenta` como objetos;
- `proveedores` y `observaciones` como arreglos de objetos (el análisis accede a sus campos);
- `simulacionPrecios` como arreglo de números finitos.

**Decisión (registros válidos mezclados con uno incompatible): se rechaza la lectura completa
(todo-o-nada) y se informa por el estado de error existente.** Consecuencias: ningún registro se
carga mientras exista uno incompatible (la app muestra el error y opera con la lista previa vacía);
no se filtran ni se descartan registros silenciosamente; el contenido original de `localStorage`
queda **intacto**. Se descarta filtrar los válidos porque ocultaría datos y podría inducir a creer
que el resto no existe, sin aprobación previa.

**Conservación de datos**: `crear`, `actualizar` y `eliminar` llaman primero a `leer()`; si la
lectura falla, nunca se alcanza `escribir()`. Por eso una lectura fallida no puede provocar una
escritura que borre los datos (probado: `producto-repositorio-local.spec.ts` "una lectura fallida no
provoca una escritura que borre los datos"). El `ProductoStore.cargar()` en error conserva el estado
previo (no lo vacía) y expone `errorLectura()`.

### 3) Rechazo sin manejar al guardar configuración (REAL, robustez)
`ConfiguracionComponent.guardar()` dejaba propagar el rechazo de `store.guardar()` si fallaba la
escritura. Corrección: `try/catch`; en error `guardado()` queda en `false` (sin confirmación falsa)
y el mensaje se expone por `store.error()`; no se borra ni se restaura la configuración anterior
silenciosamente.

### 4) La aplicación no arrancaba en el navegador: pantalla en blanco (REAL, bloqueante)
`src/app/app.config.ts` registraba `provideZoneChangeDetection({ eventCoalescing: true })`, que
**requiere Zone.js**. En este proyecto Zone.js no está instalado ni cargado: no figura en
`package.json`, no existe en `node_modules` y `angular.json` no declara `polyfills`. Al iniciar,
Angular intenta crear `NgZone` y ejecuta
`if (typeof Zone == 'undefined') { throw new RuntimeError(908, 'In this configuration Angular requires Zone.js') }`
(ver `@angular/core/.../NgZone` y `Zone.assertZonePatched()`). El bootstrap abortaba y el navegador
mostraba el `index.html` sin contenido → **pantalla en blanco**.

Por qué no lo detectaban el build ni los tests: el build solo compila (el throw es en runtime); los
specs existentes usan `TestBed` con providers propios y **ninguno arrancaba `app.config.ts`**, de modo
que nunca se ejecutaba el bootstrap real.

Corrección (causa raíz): usar detección de cambios sin Zone, coherente con el default de Angular 22 y
con que la app ya está basada en señales (no hay `NgZone`/`ChangeDetectorRef`/`setTimeout` en el código
de la app). Se reemplazó por `provideZonelessChangeDetection()` en `app.config.ts`. No se agregaron
dependencias.

Prueba de regresión: `src/app/app.config.spec.ts` ejecuta `bootstrapApplication(AppComponent, appConfig)`
en jsdom, espera `whenStable()` y verifica que el shell (header/nav) renderiza. Se comprobó que **con
el código original esta prueba falla con `NG0908: In this configuration Angular requires Zone.js`**, y
que con el arreglo pasa.

## 7.bis Observaciones menores (sin cambio de definición de negocio)

- La regla de "oportunidad" no descarta precios muy por debajo del mercado (solo los "dentro" o por
  encima se evalúan simétricamente en la alerta). Se deja como está para no alterar la definición de
  negocio; se anota como riesgo residual.
- Mensajes de `supuestos` del PMR mencionan "distribución de costos fijos" aunque CF=0. Cosmético.

## 8. Pruebas pendientes

- **Manual en navegador** (no ejecutada aquí): flujo completo, recarga real, responsive, accesibilidad.
- Edición/borrado de una observación de mercado desde la UI (sin test de componente dedicado).
- Escenarios conservador / normal / optimista (Etapa 2 pendiente, no auditado).
- Entrada de costos fijos en la UI (hoy no existe; limita punto de equilibrio y PMR en la práctica).

## 9. Pasos manuales para el usuario

Comandos (PowerShell, en `C:\Users\E15\Desktop\ReventaOP`):

```powershell
# Tests
.\node_modules\.bin\ng test --no-watch

# Build de producción
.\node_modules\.bin\ng build --configuration production

# Servidor de desarrollo
.\node_modules\.bin\ng serve
# Abrir http://localhost:4200
```

Pasos sugeridos en el navegador:
1. Configuración: cargar capital y umbrales; guardar; recargar (F5) y verificar que persisten.
2. Crear análisis: intentar guardar vacío (debe avisar); borrar "Envío del proveedor" y confirmar que
   no permite guardar; completar datos y guardar.
3. Ver detalle: agregar 2 proveedores con distinta compra mínima y envío; verificar "Mejor costo
   efectivo"; cargar 3 observaciones de mercado y verificar mín/máx/media/mediana y comparación.
4. Simulador: agregar precios (y "sugeridos"); verificar margen/ROI.
5. Dashboard: verificar los contadores y que se actualizan tras editar/eliminar.
6. Eliminar un producto y confirmar que desaparece de la lista.
7. Abrir una URL inexistente, p. ej. `http://localhost:4200/productos/no-existe`, y ver el estado
   vacío controlado.
8. (Opcional, con cuidado) En DevTools > Application > Local Storage, editar
   `reventa.intelligence.productos.v1` con un arreglo inválido y confirmar que la app muestra un
   error de lectura y **no** borra el contenido.

## 10. Resultados finales

- Tests: **131 pasando (20 archivos)** en esta auditoría. (Actualizado a **187 pasando en 27
  archivos** tras el catálogo de proveedores, el precio automático y la búsqueda de mercado; ver
  secciones 11, 12 y 13.) Respecto
  de la línea base (111) se
  agregaron **20 pruebas** en esta ronda:
  - Validación de grupo del formulario (1) + controles condicionales por modo (1).
  - Adaptador local: dañado, no-arreglo, incompatible, elemento de arreglo no válido, mezcla
    válido+incompatible, lectura fallida no borra, escritura fallida, sin almacenamiento (adaptador:
    6 en esta ronda; total del archivo 15).
  - Configuración: éxito, fallo de rango y fallo de guardado (4).
  - Dashboard con datos incompatibles (1).
  - Casos límite financieros (8).
  - Bootstrap real de la aplicación con `appConfig` (1, regresión de la pantalla en blanco).
- Build de producción: **OK**. Único warning preexistente: `@import` de Sass deprecado (Tailwind v4).
- Sin errores nuevos de TypeScript.
- **Archivos modificados**:
  - `src/app/app.config.ts` (`provideZoneChangeDetection` → `provideZonelessChangeDetection`).
  - `src/app/features/productos/producto-form.component.ts` (validador de grupo aplicado).
  - `src/app/data/adapters/producto-repositorio-local.ts` (validación de forma al leer).
  - `src/app/features/configuracion/configuracion.component.ts` (`try/catch` al guardar).
  - Specs: `producto-form.component.spec.ts`, `producto-repositorio-local.spec.ts`,
    `configuracion.component.spec.ts`, `financial.service.spec.ts`, `dashboard.component.spec.ts`,
    `app.config.spec.ts` (nueva).
- Correcciones confirmadas: 4 (validador de grupo; validación de datos locales incompatibles;
  guardado de configuración; bootstrap zoneless / pantalla en blanco).

### Riesgos de datos que todavía existen
- Persistencia solo en el navegador/equipo; se pierde al limpiar datos del navegador. No hay respaldo.
- Si hay datos incompatibles, la app los **protege** (no los borra) pero no permite acceder a los
  registros válidos mezclados hasta resolverlos manualmente (todo-o-nada, por diseño). Esto es
  intencional y no debe cambiarse sin aprobación.
- Sin límite de cuota ni control de tamaño; una cuota llena produce error de escritura controlado.
- No hay migración de esquema: si el modelo `Producto` cambia de forma incompatible, los datos
  antiguos se reportarán como incompatibles (no se pierden, pero tampoco se migran).

## 11. Catálogo de proveedores (2026-10-19)

Cambio funcional posterior a la auditoría (a pedido del usuario): los proveedores ahora se crean
como entidad propia y se asignan a los análisis.

- **Modelo**: `ProveedorCatalogo` (id, nombre, teléfono, email, web, dirección, notas, fechas). Los términos
  comerciales (precio, envío, stock, compra mínima) siguen por producto (`Producto.proveedores[]`).
- **Persistencia** (mismo patrón que productos, sin backend):
  `data/ports/proveedor-repositorio.ts`, `data/adapters/proveedor-repositorio-local.ts`
  (clave `reventa.intelligence.proveedores.v1`) y `data/proveedor-store.service.ts`
  (`PROVEEDOR_REPOSITORIO`). Datos dañados/incompatibles: error de lectura controlado y **no** se
  sobrescriben (misma política todo-o-nada y de conservación de datos ya auditada).
- **UI**: la página *Proveedores* permite alta/edición/baja del catálogo y conserva la vista de costo
  efectivo. En el formulario de producto, "Proveedor principal" se elige con un **popup** del catálogo
  (muestra nombre y dirección) que asigna `Producto.proveedorPrincipalId`; en el detalle, las ofertas
  pueden referenciar el catálogo (`Proveedor.proveedorId`).
- **Compatibilidad**: los campos nuevos son opcionales; datos previos siguen cargando sin migración
  (el `proveedorPrincipal` de texto legado se conserva). No se borraron ni sembraron datos.
- **Pruebas**: +17 (adaptador 12 + store 5) y +3 de UI (crear proveedor en el catálogo; asignar
  proveedor principal al guardar un producto; elegir el principal desde el popup con su dirección).
  Total: **151 tests, 22 archivos** en verde; build de producción OK.

## 12. Precio de venta automático y recomendación (2026-10-19)

Cambio funcional posterior a la auditoría (a pedido del usuario): el formulario de producto calcula
el precio de venta a partir de un margen deseado y lo compara/recomienda contra precios de otros
lugares.

- **Fórmula (dominio, sin duplicar)**: `precioVentaParaMargen(input, margenPct)` en
  `domain/financial/financial.service.ts` despeja `precio = A / (1 - t - margen)` (A = costos variables
  fijos por unidad; t = comisión/impuestos proporcionales al precio). Devuelve `null` cuando no hay
  solución; no inventa valores.
- **Inputs opcionales**: `construirAnalisisInput(datos, { precioVentaOpcional: true })` permite
  calcular sin precio cargado, reutilizado por el validador de grupo.
- **Mercado**: los precios de otros lugares se cargan como lista rápida y alimentan
  `calcularEstadisticasMercado` y `clasificarPrecioEnMercado` (`domain/market/recomendacion-precio.ts`),
  que ubica el precio propio en por debajo / dentro / por encima / sin mercado. El precio propio nunca
  se incluye en la muestra.
- **UI**: en "3) Venta" se elige margen deseado (%) o precio de venta; en modo margen el precio se
  completa solo. En "4)" se comparan los precios de otros lugares y se muestra la recomendación.
- **Verificado**: build de producción OK y **161 tests en verde (23 archivos)** (nuevos:
  `precioVentaParaMargen` x3, `recomendacion-precio.spec.ts` x4, `construirAnalisisInput` opcional +1,
  formulario margen +1 y comparación de mercado +1).

## 13. Búsqueda automática de precios de mercado — Fase A (2026-10-19)

Cambio de alcance pedido por el usuario: la búsqueda automática de precios pasa a ser funcionalidad
central; la carga manual queda como respaldo. Informe completo (fuentes, límites, arquitectura,
contrato de backend y riesgos) en `docs/INTEGRACION_MERCADO.md`.

- **Investigación (verificada, no inventada)**: la API oficial de Mercado Libre exige OAuth
  (Authorization Code) y, desde ~abril 2025, `GET /sites/MLA/search` requiere `access_token` de un
  usuario (sin token: 403). El `client_secret`/`refresh_token` no pueden estar en el frontend, así que
  la integración real necesita un **backend propio** (a crear). Scraping: descartado por condiciones de
  uso.
- **Arquitectura desacoplada** (sin tocar el motor financiero): puerto `domain/market/fuente-mercado.ts`
  (`FuenteMercado` + estados `ok | sin_resultados | insuficiente | no_configurado | no_disponible |
  limite | error`); `data/adapters/fuente-mercado-http.ts` (`FuenteMercadoHttp` contra el contrato del
  backend, `FuenteMercadoNula` = sin fuente); `data/mercado-store.service.ts` (`MercadoStore` + tokens
  `FUENTE_MERCADO`/`MERCADO_BASE_URL`).
- **Modelo/mapeo**: `core/models/mercado.model.ts` (`PublicacionMercado` propio, nunca el JSON crudo);
  `domain/market/observaciones-mercado.ts` convierte a `ObservacionMercado`, deduplica por
  `fuente+itemId`/URL y detecta caducidad. El precio propio nunca entra en la muestra.
- **UI**: panel `busqueda-mercado.component.ts` montado en "4) Precios…" del formulario: buscar,
  incluir/excluir, conteo encontradas/usadas, estadísticas de la selección, aviso de desactualización y
  "Usar seleccionadas" (vuelca a `observaciones` con dedupe). Sin backend configurado muestra
  "no configurada" (no hay datos ficticios).
- **Compatibilidad**: `ObservacionMercado` admite `origen`/`fuente`/`refExternaId` opcionales.
  `app.config.ts` agrega `provideHttpClient()` y lee la URL del backend de
  `globalThis.__REVENTA_MERCADO_BASE_URL__` (por defecto `null`). No hay secretos en el frontend.
- **Verificado**: build de producción OK y **199 tests en verde (30 archivos)** (nuevos:
  `observaciones-mercado.spec.ts`, `fuente-mercado-http.spec.ts`, `mercado-store.service.spec.ts`,
  `busqueda-mercado.component.spec.ts`). La conexión real con Mercado Libre queda **bloqueada** hasta
  crear la app ML, autorizar OAuth y proveer el backend; no se probó contra la API real.

## 14. Backend de integración de mercado (NestJS) — (2026-10-19) - IMPLEMENTADO

- **Nuevo proyecto independiente** en `backend/` (NestJS 11 + TypeScript, CommonJS; `fetch` nativo de
  Node 22). No modifica frontend ni motor financiero. Resguarda `client_secret`/`refresh_token`.
- **Contrato**: `GET /market/search?q=&site_id=&limit=` → mismo contrato que consume el frontend.
  Parámetros inválidos → `400`. Estados: `ok | sin_resultados | insuficiente | no_configurado |
  no_disponible | limite | error`.
- **OAuth**: `oauth/token.service.ts` renueva el access token y persiste el `refresh_token` rotativo
  (archivo modo 600). El token nunca aparece en respuesta ni logs. Límite local por IP/minuto (429).
- **Adaptador**: `mercado/adapters/mercadolibre.fuente.ts` contra la API oficial `/sites/{site}/search`
  (sin scraping). Solo lectura; sin DB ni auth de usuarios.
- **Verificado con simulaciones**: `npm test` en `backend/` → **47 tests en verde** (5 suites);
  `npm run build` OK. **No** probado contra la API real (faltan credenciales del usuario).
- **Revisión de seguridad (2026-10-19)**: corregida la concurrencia de renovación (**single-flight**;
  el `refresh_token` de ML es de un solo uso y rota), escritura **atómica** del store con permisos
  best-effort (limitados en Windows), respuesta OAuth inválida/incompleta no sobrescribe tokens
  válidos, `q` limitado a 120 caracteres, poda del mapa de rate-limit, y `code_verifier` (PKCE)
  opcional en el canje. `state`/PKCE dependen de la configuración de la app ML (pendiente de confirmar).
- Detalle, variables de entorno y pasos manuales: `docs/INTEGRACION_MERCADO.md` §5.

## 15. Datos de demostración (escenario "revendedor de tecnología") — (2026-10-19) - COMPLETADA

- **Dataset de prueba claramente ficticio**: 28 productos de tecnología + 6 proveedores, con
  prefijo `[DEMO]` en nombres y texto "DATOS DE PRUEBA FICTICIOS". **No** son precios de mercado
  ni provienen de Mercado Libre u otra fuente externa: son números inventados a mano.
- Generador único: `scripts/generar-demo.mjs` → `src/app/demo/datos-demo.ts` (para pruebas) y
  `public/datos-demo.json` (para el navegador). Regenerable; no editar a mano.
- **Verificado con pruebas automatizadas** (`src/app/demo/datos-demo.spec.ts`, 5 pruebas en verde):
  el dataset pasa por los repositorios locales reales (validación del adaptador), el motor de
  análisis finanzas/mercado/riesgo lo procesa sin errores ni valores no finitos, `resumirDashboard`
  lo agrega, y `ProductosComponent` lo renderiza completo. Se cubren a propósito los alertas
  `MARGEN_INSUFICIENTE`, `PRECIO_FUERA_DE_MERCADO`, `INFO_MERCADO_INSUFICIENTE`,
  `DATOS_INCOMPLETOS` y `PROVEEDOR_ALTERNATIVA_MAS_BARATA`.
- **No** es una prueba contra datos reales de mercado ni una validación del negocio: solo
  demuestra que la app soporta un volumen realista de trabajo sin romperse.
- No modifica el contrato frontend-backend ni el motor financiero. Regresión: **199 tests / 30
  archivos** en verde y build de producción OK (el dataset no entra al bundle JS).

### 15.1 Recorrido de usuario real y carga desde la interfaz (2026-10-21)

- **Botón "Cargar datos de ejemplo"** en el estado vacío de Productos
  (`src/app/demo/cargar-datos-demo.ts`): descarga `public/datos-demo.json`, valida que esté sellado
  como dato de prueba, escribe por las mismas claves que los repositorios locales, **verifica**
  releyendo con los repositorios reales y **revierte** si algo falla. Nunca sobrescribe datos del
  usuario (si hay algo, informa y no toca nada).
- **Recorrido de usuario real** (`src/app/features/sesion-usuario-demo.spec.ts`, verificado): arranca
  vacío → carga los datos de ejemplo → recorre Dashboard, Productos, Proveedores, Configuración y
  Detalle del producto de mayor inversión → agrega un precio al simulador → confirma conteos finales
  (28 productos / 27 calculables / 1 sin costo / 17 con alerta media o alta / 11 oportunidades).
- **Reporte legible** `demo/estado-final.json` (generado con `npm run demo:reporte`): lista cada
  producto con costos, mediana de mercado, proveedores, margen, ROI, nivel de riesgo y alertas.
- Pruebas nuevas: `cargar-datos-demo.spec.ts` (6) y `sesion-usuario-demo.spec.ts` (1). Total
  frontend: **199 tests / 30 archivos**; build de producción OK.

## 16. Capa de IA (resumen de precios) — backend (2026-10-21)

Pedido del usuario: que la app consulte una IA que reúna precios de mercado. Se acordó y documentó
el **alcance correcto**: la IA es un *resumidor* de datos reales, nunca una fuente de precios
(BIBLIA.md:41). Se evaluó IA local (Ollama) y cloud; se eligió **Gemini** (tier gratuito con búsqueda).

- **Prueba real de IA local (Ollama, hecha y cronometrada)**: `llama3` corre a ~6,8 tokens/s en el
  equipo del usuario (sin GPU dedicada). Se le pidió "precios de auriculares en Argentina" y **inventó
  cifras** aunque dijo "según datos reales". Esto confirma por qué la IA **no** puede ser fuente de
  precios y por qué el diseño exige datos reales previos.
- **Investigación de proveedores (verificada, 2026-10-21)**: Mercado Libre cerró `search` libre (403
  incluso con token). Opciones: Perplexity (~US$0,001–0,006/búsqueda, sin gratis), OpenAI
  (~US$0,058/producto), Google Gemini (**gratis**: tokens $0 + 500 búsquedas web/día).
- **Arquitectura** (`backend/src/ia/`): puerto `IAProvider` + adaptador `gemini.ia.ts` (Grounding with
  Google Search), `ia.service.ts`, `POST /ia/resumir`, `prompt-resumen.ts` (prohíbe inventar). La IA
  recibe solo publicaciones ya traídas con URL; el dominio sigue calculando la mediana.
- **Seguridad**: API key solo en el backend (header, nunca en URL ni logs); por defecto la IA está
  **desactivada** (`IA_PROVEEDOR=ninguno`) y responde `no_configurado` sin inventar.
- **Pruebas**: backend **68 en verde / 9 suites** (agrega config IA, adaptador Gemini, servicio y
  controlador). Prueba de humo real sin key → `no_configurado` (sin datos ficticios).
- **NO verificado aún**: llamada real a la API de Gemini (requiere API key del usuario). No afirmar
  que la búsqueda web real funciona hasta probarla con credenciales válidas.
