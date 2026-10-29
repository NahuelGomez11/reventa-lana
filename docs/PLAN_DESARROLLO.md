# PLAN_DESARROLLO.md

## Estado actual

- **Etapa 1 completada.**
- **Etapa 2 completada** (mercado manual, simulador, reglas de riesgo). Escenarios
  conservador/normal/optimista y mejoras UI/UX: pendientes.
- Persistencia: **almacenamiento local del navegador (DEMO / TEMPORAL)** detrás de un contrato de
  repositorio. Sin backend. Pendiente sustituir por API (Etapa 3).
- Búsqueda automática de precios: Fase A (frontend) completada y **backend de integración de mercado
  (NestJS, `backend/`) implementado y probado con simulaciones** (47 tests jest en verde, build OK).
  La conexión real con Mercado Libre queda pendiente de credenciales (ver `docs/INTEGRACION_MERCADO.md`).
- Pruebas: frontend **199 tests, 30 archivos** (`ng test --no-watch` en verde); backend **47 tests**
  (`npm test` dentro de `backend/`, en verde).
- Build de producción: OK (`ng build --configuration production`). Único warning: `@import` de
  Sass deprecado en `src/styles.scss` (Tailwind v4).

## Cómo ejecutar / verificar

> En este entorno `npm`/`npx` tienen inconvenientes; usar los binarios locales.

- Tests: `.\node_modules\.bin\ng test --no-watch`
- Build producción: `.\node_modules\.bin\ng build --configuration production`
- Dev server: `.\node_modules\.bin\ng serve`

## Catálogo de proveedores (2026-10-19) - COMPLETADA

- Nueva entidad `ProveedorCatalogo` con datos propios (nombre, teléfono, email, web, dirección,
  notas) en
  `src/app/core/models/proveedor.model.ts`. Los términos comerciales (precio, envío, stock, compra
  mínima) siguen siendo **por producto/oferta** (`Producto.proveedores[]`), porque el precio cambia
  según el producto y la cantidad.
- Persistencia con el mismo patrón que productos: `data/ports/proveedor-repositorio.ts`, adaptador
  local `data/adapters/proveedor-repositorio-local.ts` (clave
  `reventa.intelligence.proveedores.v1`) y store `data/proveedor-store.service.ts`
  (`PROVEEDOR_REPOSITORIO` sustituible por API). Datos dañados/incompatibles: error controlado y NO
  se sobrescriben.
- Página **Proveedores**: alta/edición/baja del catálogo (con confirmación al eliminar). Se conserva
  la vista de **costo efectivo** por producto.
- Formulario de producto: "Proveedor principal" se elige con un **popup** del catálogo (muestra
  nombre y dirección) que asigna `Producto.proveedorPrincipalId`. En el detalle, cada oferta de
  proveedor puede provenir del catálogo (`Proveedor.proveedorId`) y el detalle muestra el proveedor
  principal asignado.
- Compatibilidad hacia atrás: los campos nuevos son opcionales; los productos cargados antes siguen
  funcionando (el `proveedorPrincipal` de texto legado se conserva sin migrar).

## Precio de venta automático y recomendación (2026-10-19) - COMPLETADA

- En el formulario de producto (sección "3) Venta") se puede definir el precio **por margen deseado
  (%)** o **por precio de venta** (toggle `modoPrecio`). En modo margen, el precio de venta se calcula
  y completa automáticamente para alcanzar ese **margen neto sobre ventas**.
- Lógica en dominio (sin duplicar fórmulas): `precioVentaParaMargen(input, margenPct)` en
  `domain/financial/financial.service.ts`, que despeja `precio = A / (1 - t - margen)` (A = costos
  variables fijos por unidad; t = comisión/impuestos proporcionales al precio). Devuelve `null` si no
  hay solución y NO inventa valores. `construirAnalisisInput` acepta `{ precioVentaOpcional: true }`
  para permitir el cálculo sin precio cargado.
- "Precios de otros lugares" (sección "4"): se cargan observaciones (lista rápida) que alimentan
  `calcularEstadisticasMercado` (mín/máx/mediana/muestra suficiente) y `clasificarPrecioEnMercado`
  (`domain/market/recomendacion-precio.ts`) para ubicar el precio propio respecto del rango:
  por debajo / dentro / por encima / sin mercado.
- La recomendación usa la misma proyección que el detalle (`analisis`): no se estima demanda ni se
  inventan datos de mercado.
- Verificado: build de producción OK y **161 tests en verde** (23 archivos).

## Búsqueda automática de precios (Mercado Libre) — Fase A (2026-10-19) - COMPLETADA

- **Cambio de alcance**: la búsqueda automática de precios pasa a ser funcionalidad central; la carga
  manual de observaciones queda como **respaldo**. Informe con fuentes/límites/arquitectura en
  `docs/INTEGRACION_MERCADO.md`.
- Arquitectura desacoplada (sin tocar el motor financiero): puerto `FuenteMercado` +
  `FuenteMercadoHttp` (habla con un backend propio) + `FuenteMercadoNula` ("no configurado").
  `MercadoStore` (signals) + tokens `FUENTE_MERCADO` / `MERCADO_BASE_URL`.
- El frontend **nunca** llama a `api.mercadolibre.com` ni guarda secretos; `client_secret` y
  `refresh_token` deben vivir en el backend (a crear).
- Resultados como `PublicacionMercado` (título, precio, moneda, URL, fuente, condición, envío,
  fecha), dedupe por `itemId`/URL y conversion a `ObservacionMercado` (`origen:'auto'`).
- Panel "Buscar precios de mercado" en la sección "4) Precios…": buscar, incluir/excluir, conteo
  encontradas/usadas, estadísticas de la selección, aviso de desactualización y "Usar seleccionadas".
  Sin backend configurado muestra "no configurada" (nunca datos ficticios).
- `ObservacionMercado` ahora admite `origen`/`fuente`/`refExternaId` opcionales (compatibles).
- Verificado: build de producción OK y **187 tests en verde** (27 archivos). La integración real queda
  **bloqueada** hasta crear app ML + backend + credenciales.

## Backend de integración de mercado (NestJS) — Fase B (2026-10-19) - IMPLEMENTADO

- Proyecto **independiente** en `backend/` (NestJS 11 + TypeScript, CommonJS). No toca el frontend ni el
  motor financiero. Resguarda los secretos de Mercado Libre y expone `GET /market/search`.
- Usa `fetch` nativo de Node 22. OAuth (`/oauth/token`) con rotación persistida del `refresh_token`
  (archivo modo 600). Límite local por IP/minuto. CORS configurable. Sin DB ni auth de usuarios.
- Estados: `ok` / `sin_resultados` / `insuficiente` / `no_configurado` / `no_disponible` / `limite` /
  `error`. El token nunca se expone en respuesta ni logs.
- Detalle, variables de entorno y pasos manuales en `docs/INTEGRACION_MERCADO.md` §5.
- Verificado con simulaciones: `npm test` en `backend/` → **47 tests en verde**; `npm run build` OK.
  **No** se probó contra la API real (faltan credenciales del usuario).
- Revisión de seguridad (2026-10-19): renovación de token **single-flight** (el `refresh_token` es de
  un solo uso y rota), escritura **atómica** del store, respuesta OAuth inválida no sobrescribe tokens
  válidos, `q` limitado a 120 caracteres, poda del mapa de rate-limit; PKCE soportado en el canje.

## Datos de demostración: escenario "revendedor de tecnología" (2026-10-19) - COMPLETADA

Para poder usar la app con un volumen realista de trabajo **sin inventar precios de mercado**,
se generó un dataset de **prueba claramente ficticio** (no proviene de Mercado Libre ni de otra
fuente; todos los productos/proveedores/observaciones llevan el prefijo `[DEMO]`).

- Generador: `scripts/generar-demo.mjs` → escribe
  - `src/app/demo/datos-demo.ts` (tipado, solo lo usan las pruebas) y
  - `public/datos-demo.json` (lo sirve `ng serve` para cargarlo en el navegador).
- Contenido: **28 productos de tecnología** (celulares, notebooks, tablets, monitores, audio,
  wearables, gaming, almacenamiento, redes) + **6 proveedores ficticios**, con costos, envíos,
  comisión de canal 13%, observaciones de mercado inventadas y casos "sucios" a propósito
  (margen fino, precio muy por encima del mercado, mercado insuficiente, datos sin completar).
- Verificación automatizada: `src/app/demo/datos-demo.spec.ts` (5 pruebas) carga el dataset por
  los **repositorios reales** (localStorage), lo analiza con el motor de dominio, lo renderiza en
  `ProductosComponent` y verifica que no se rompa ningún camino. Imprime un reporte por margen.
- Para verlo en el navegador: `ng serve`, abrir `localhost:4200` y pegar `demo/cargar-demo.js`
  en la consola (F12). Borra los datos de prueba con `localStorage.clear()`.
- El dataset **no** entra al bundle de producción (no está importado por la app); sí se copia
  `datos-demo.json` a `dist/` como asset estático: borrarlo antes de cualquier despliegue.
- Carga desde la interfaz: en el estado vacío de **Productos** aparece el botón
  **"Cargar datos de ejemplo"** (`src/app/demo/cargar-datos-demo.ts`). **Nunca** sobrescribe datos
  existentes, solo carga si el almacén está vacío y revierte si la verificación falla. Scripts:
  `npm run demo:generar` (regenerar el dataset) y `npm run demo:reporte` (escribir
  `demo/estado-final.json` con el resultado de la sesión de prueba).
- **Recorrido de usuario real** (`src/app/features/sesion-usuario-demo.spec.ts`): arranca vacío,
  carga los datos de ejemplo, recorre Dashboard, Productos, Proveedores, Configuración y el Detalle
  del producto de mayor inversión, agrega un precio al simulador, y verifica los conteos finales
  (28 cargados / 27 calculables / 1 sin costo / 17 con alerta media o alta). Reporte legible en
  `demo/estado-final.json`.

## Rediseño visual "LANA" (2026-10-19) - COMPLETADA

- Rebrand visible: la app se llama **LANA** (`src/index.html` title/`lang="es"`/meta, `app.component.ts`
  `appName`, header y footer). Documentos (`BIBLIA.md`, `README.md`) conservan el nombre histórico.
- Diseño mobile-first: barra superior sticky (glass/blur) con logo y navegación en `md+`; **barra de
  navegación inferior fija** (íconos + etiquetas) en móvil; `main`/`footer` con padding inferior para
  no quedar tapados.
- Sistema de diseño en `src/styles.scss` con `@theme` (paleta `brand` índigo) y clases reutilizables
  en `@layer components`: `card`, `tile`, `btn-primary/secondary/danger/soft-danger/ghost`, `btn-xs`,
  `input` (+ `input-error`, `select.input`). Paleta neutra `slate` y acento `brand` en toda la UI.
- Los 15 templates se migraron a esas clases (sin cambiar textos ni lógica de dominio).
- Verificado: build de producción OK y **131 tests en verde** (20 archivos).

## Auditoría funcional del MVP (2026-10-16) - COMPLETADA

Informe completo en `docs/AUDITORIA_MVP.md`.
- Verificación estática + automatizada (131 tests) + build de producción. La prueba manual en
  navegador NO se ejecutó en este entorno (sin herramienta de navegador); pasos en el informe.
- Correcciones reales: (1) el validador de grupo `validarCalculable` no estaba aplicado al
  formulario (permitía guardar productos no calculables); (2) datos locales incompatibles rompían
  la UI (ahora se valida la forma del registro y de los elementos de sus arreglos; error de lectura
  controlado, todo-o-nada, sin sobrescribir); (3) rechazo sin manejar al guardar configuración
  (ahora se refleja en `store.error()`); (4) **la app no arrancaba (pantalla en blanco)**: usaba
  `provideZoneChangeDetection` sin Zone.js instalado; ahora usa `provideZonelessChangeDetection`
  (Angular 22, app basada en señales) y hay prueba de humo del bootstrap real (`app.config.spec.ts`).
- Finanzas: fórmulas verificadas contra `docs/REGLAS_FINANCIERAS.md`, sin doble conteo; BEQ, PMR e
  inversión inicial son conceptos distintos.

## Etapa 1: Fundamentos (MVP base) - COMPLETADA
Criterios de aceptación:
- [x] Entorno inspeccionado, versiones documentadas.
- [x] Documentación creada: BIBLIA.md, docs/REQUISITOS.md, docs/REGLAS_FINANCIERAS.md, docs/ARQUITECTURA.md, docs/PLAN_DESARROLLO.md, AGENTS.md.
- [x] Proyecto Angular configurado. Compila.
- [x] Tailwind CSS configurado.
- [x] Estructura por carpetas (core/domain/features/shared/data).
- [x] Layout principal con navegación real.
- [x] Rutas lazy-loaded.
- [x] Motor financiero puro con tipos.
- [x] Pruebas unitarias de fórmulas principales.
- [x] Pantallas: Dashboard, Productos (lista), Crear/Editar análisis, Detalle, Proveedores, Configuración.
- [x] Estados vacíos, responsive, navegación funcional.

## Etapa 2: Mercado, simulador y riesgo - COMPLETADA
- [x] Observaciones de mercado manuales + cálculos (mín/máx/media/mediana) y diferencia vs mediana.
- [x] Simulador de precios con tabla (reutiliza el motor financiero; no duplica fórmulas).
- [x] Reglas de riesgo determinísticas + alertas con severidad y razón concreta.
- [x] Comparación de proveedores por costo efectivo (precio + envío + otros repartidos).
- [ ] Escenarios conservador/normal/optimista.
- [ ] Mejoras UI/UX adicionales.

## Etapa 3: Preparación backend/IA + pulido
- [x] Interfaces para repositorios (sin conectar): `src/app/data/ports/producto-repositorio.ts`.
- [x] Capa de IA (resumen) en el backend: interfaz `IAProvider` + adaptador Gemini (desactivado por defecto).
- [ ] PWA checklist.
- [ ] Documentar limitaciones (avanzado).
- [ ] Validación integral.

## Capa de IA (resumen de precios) — backend (2026-10-21) - COMPLETADA (sin verificar contra API real)

La IA cumple un rol **acotado**: es un *resumidor*, no una fuente de precios. Recibe publicaciones
que ya trajo una fuente real (con URL) y devuelve un resumen + fuentes citadas. Nunca inventa precios
ni recalcula finanzas (BIBLIA.md:41).

- Módulo nuevo `backend/src/ia/`: `ia.config.ts`, `ia.port.ts` (`IAProvider`), `prompt-resumen.ts`,
  `ia.service.ts`, `ia.controller.ts` (`POST /ia/resumir`), `ia.module.ts`,
  `adapters/gemini.ia.ts` (Gemini + Grounding with Google Search).
- **Por defecto desactivada** (`IA_PROVEEDOR=ninguno`): sin configurar, responde `no_configurado` y no
  inventa (verificado con prueba de humo real).
- Proveedor implementado: **Gemini** (`gemini-2.5-flash`). La API key vive solo en el backend.
- Pruebas: **68 en verde / 9 suites** (agrega config, adaptador Gemini, servicio y controlador de IA).
- **Pendiente**: verificar contra la API real de Google con una API key válida (no hecho aún).

## Alcance implementado (sesión Etapa 2)

### Dominio (puro, sin dependencias de UI)
- `domain/financial/financial.service.ts`: motor (`calcularFinanzas`).
- `domain/financial/construir-analisis.ts`: datos crudos -> input del motor; `null` = dato faltante
  (nunca 0 silencioso).
- `domain/financial/simulacion.ts`: `simularPrecios`, `preciosSugeridos`.
- `domain/market/market-stats.ts`: estadísticas de precios externos.
- `domain/providers/comparacion-proveedores.ts`: costo efectivo y mejor proveedor comparable.
- `domain/risk/risk-rules.ts`: `evaluarRiesgo`, `severidadMaxima`, `CODIGOS_ALERTA`.
- `domain/analysis/analisis-producto.ts`: orquesta el análisis completo de un producto.
- `domain/analysis/resumen-dashboard.ts`: agregados con definición válida (no suma cartera).

### Datos
- `data/ports/producto-repositorio.ts`: contrato (`listar/obtener/crear/actualizar/eliminar`) +
  `ErrorRepositorio` con códigos.
- `data/adapters/producto-repositorio-local.ts`: **adaptador local de demostración**
  (`localStorage`, clave `reventa.intelligence.productos.v1`). Datos dañados: informa error y NO
  sobrescribe.
- `data/producto-store.service.ts`: estado reactivo (señales) + `PRODUCTO_REPOSITORIO`
  (InjectionToken) sustituible por API sin tocar componentes.
- `data/configuracion-store.service.ts`: capital, moneda y umbrales (clave
  `reventa.intelligence.configuracion.v1`).
- `data/proveedor-store.service.ts` + `data/ports/proveedor-repositorio.ts` +
  `data/adapters/proveedor-repositorio-local.ts`: catálogo de proveedores (clave
  `reventa.intelligence.proveedores.v1`), mismo patrón que productos.

### Presentación
- Formulario crear/editar: `features/productos/producto-form.component.*`
  (rutas `/productos/nuevo` y `/productos/:id/editar`).
- Lista: `features/productos/productos.component.ts` (tabla con análisis real, eliminar con
  confirmación).
- Detalle: `features/productos/detalle-producto.component.ts` + editores
  `proveedores-producto`, `mercado-editor`, `simulador-precios`.
- Dashboard, Proveedores (catálogo + costo efectivo) y Configuración conectados a los stores.
- Compartidos: pipes `importe`, `porcentaje`, `numero`, `fecha`; componentes `estado-vacio`,
  `nivel-riesgo`, `lista-alertas`, `resumen-financiero`, `campo-numero`, `campo-texto`.

### Decisiones
- `null` = dato faltante; los cálculos incompletos NO muestran cifras estimadas.
- No se siembran datos demo: nada de precios de mercado ficticios.
- La IA nunca recalcula finanzas ni modifica datos originales (no implementada aún).
- Los resultados financieros NO se persisten: se recalculan siempre con el dominio.
- Los productos guardados deben ser calculables (validador a nivel de formulario reutiliza
  `construirAnalisisInput`).

### Limitaciones conocidas
- Persistencia solo en este navegador/equipo; se pierde al limpiar datos del navegador.
- Toda observación de mercado y proveedor se carga manualmente; sin scraping ni APIs.
- Umbrales de riesgo son supuestos configurables, no predicciones de venta/rotación.
- Sin autenticación, multiusuario ni sincronización.
- La UI no tiene campo de costos fijos: en la práctica `CF = 0`, por lo que el punto de equilibrio
  muestra 0 y PMR = CVU (el motor sí soporta CF y está probado; falta exponerlo).

## Notas
- Datos ficticios solo si son necesarios para pruebas unitarias; nunca en la app.
- No integrar servicios externos aún.
- Verificaciones por etapa: compilación, rutas, pruebas.
