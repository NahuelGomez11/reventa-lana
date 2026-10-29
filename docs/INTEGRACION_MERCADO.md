# INTEGRACION_MERCADO.md

Informe de diseño para la **búsqueda automática de precios de mercado** (fuente: Mercado Libre
Argentina). Estado: **propuesta + base desacoplada implementada**. La conexión real requiere
credenciales y un backend (ver "Qué necesita el usuario").

> Regla vigente: no inventar endpoints, credenciales, precios ni capacidades. No conectar servicios
> externos sin configuración real. No guardar secretos en el repo ni en el frontend.

---

## 1. Fuentes reales y evidencia

### 1.1 Mercado Libre — API oficial (Open Platform)

Documentación oficial: `https://developers.mercadolibre.com.ar` (site `MLA` = Argentina).

**Autenticación (verificada en docs oficiales "Authentication and Authorization"):**
- OAuth 2.0 **Authorization Code Grant** (server-side).
- URL de autorización MLA:
  `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=$APP_ID&redirect_uri=$REDIRECT_URI`
  (admite `code_challenge`/`code_challenge_method` si la app tiene PKCE habilitado).
- Canje del código por token: `POST https://api.mercadolibre.com/oauth/token`
  con `client_id`, `client_secret`, `redirect_uri`, `code`.
- El `access_token` dura **~6 horas**; se renueva con `POST /oauth/token`
  (`grant_type=refresh_token`, `client_id`, `client_secret`, `refresh_token`). El `refresh_token`
  es de **un solo uso** y se rota en cada renovación.
- Todas las llamadas privadas llevan header `Authorization: Bearer $ACCESS_TOKEN`.

**Cambio de política (crítico), desde ~abril 2025:**
- `GET /sites/MLA/search` ya **no** es anónimo: exige un `access_token` asociado a un usuario
  ("you must use an access token linked to a user"); sin token devuelve
  `{"message":"forbidden","error":"forbidden","status":403}`. Aplica también a `/products/search`.
- Consecuencia: para consultar publicaciones de terceros hay que (1) crear una app en el portal de
  developers, y (2) que una cuenta de Mercado Libre autorice la app vía OAuth.

**Endpoints relevantes y qué devuelven (verificado):**
| Endpoint | Uso | Devuelve | Requiere token |
|---|---|---|---|
| `GET /sites/MLA/search?q=&category=&sort=&offset=&limit=` | Buscar publicaciones activas | `results[]`, `paging{total,offset,limit}`, `available_filters`, `available_sorts` | Sí |
| `GET /sites/MLA/search?seller_id=` | Publicaciones de un vendedor | ídem | Sí |
| `GET /products/search?site_id=MLA&q=` | Buscar "productos de catálogo" (PDP) | `results[]` con `id` de producto | Sí |
| `GET /products/{product_id}` | Detalle de un producto de catálogo | ficha + `buy_box_winner` (precio, moneda, envío, `sold_quantity`) | Sí |
| `GET /items/{id}` | Detalle de una publicación | `price`, `currency_id`, `permalink`, `condition`, `seller_id`, `shipping{free_shipping,logistic_type,mode}`, `original_price`, `sold_quantity`, `available_quantity`, `status` | Sí (lectura de ítems ajenos según permisos) |
| `GET /items?ids=A,B,C` | Multiget, **máx. 20 ítems** | arreglo con `code` + `body` por ítem | Sí |
| `GET /items/{id}/shipping_options?zip_code=` | Costo de envío estimado | opciones de envío (depende del CP) | Sí |

**Paginación y bulk (verificado):**
- `limit` por defecto 50; `offset` funciona hasta ~1000. Para más de 1000 usar
  `search_type=scan` + paginación por `scroll_id` (el `scroll_id` expira en ~5 min).

**Límites de uso (verificado en "Rate Limit / Error 429"):**
- El control principal es **por Client ID (aplicación)** y por endpoint.
- Respuesta `429 Too Many Requests`; la recomendación oficial es **backoff exponencial con jitter**,
  reducir concurrencia y consolidar llamadas.
- `GET /applications/$APP_ID` expone `max_requests_per_hour` (ejemplo de una app: 18000/h). El valor
  real depende de la app; puede solicitarse aumento por canales comerciales con evidencia de uso.

**Condiciones de uso / restricciones (verificado):**
- No se permite scraping que infrinja los términos ni eludir controles de acceso, autenticación o
  límites. Técnicamente el scraping "funciona a veces" pero es propenso a bloqueos y con riesgo
  legal; **queda descartado**.
- `client_secret` y `refresh_token` son secretos de servidor: **no** pueden vivir en el frontend
  Angular.

### 1.2 Costos
- La API de Mercado Libre es de uso **gratuito** para apps dentro de sus límites; no hay costos por
  consulta documentados. El costo real es de **infraestructura del backend** (hosting) y de operación
  (mantener tokens válidos). Sin tarifas oficiales de pago por request documentadas.

### 1.3 Alternativas evaluadas
- **Scraping del sitio**: descartado por condiciones de uso y fragilidad.
- **Otras APIs/agregadores de precios**: no se evaluaron como fuente oficial primaria; sin
  documentación verificada aquí no se asume capacidad alguna.

---

## 2. Arquitectura propuesta (desacoplada)

Objetivo: incorporar fuentes de precios **sin tocar el motor financiero** ni el dominio.

```
UI (Angular)
  └─ MercadoStore (signals: consulta, resultados, selección, estado)
       └─ FUENTE_MERCADO (InjectionToken) ── Puerto "FuenteMercado"
            ├─ FuenteMercadoHttp   -> llama a un backend propio (proxy)
            └─ FuenteMercadoNula   -> estado "no configurado" (nunca datos falsos)

Backend (NestJS) [a crear]
  └─ /market/search  ── FuenteMercadoMercadoLibre (OAuth + /sites/MLA/search, /items, /products)
       guarda client_secret y refresh_token; aplica rate limit/backoff; cachea.
```

### 2.1 Contrato de dominio (puro, ya implementado)
- `src/app/domain/market/fuente-mercado.ts`: puerto `FuenteMercado` + estados
  (`ok | sin_resultados | insuficiente | no_configurado | no_disponible | limite | error`).
- Los resultados son `PublicacionMercado` (modelo propio), no el JSON crudo de Mercado Libre.

### 2.2 Modelo de publicación externa (ya implementado)
`src/app/core/models/mercado.model.ts` → `PublicacionMercado`:
`id`, `fuente`, `itemId`, `productId`, `titulo`, `precio`, `moneda`, `url`, `vendedor`,
`condicion`, `envio{tipo,costo}`, `disponible`, `fechaConsulta`.
Esto se mapea 1:1 a `ObservacionMercado` existente, de modo que el análisis financiero y las
estadísticas de mercado ya existentes se reutilizan sin cambios.

### 2.3 Puente a observaciones (puro, ya implementado)
- `src/app/domain/market/observaciones-mercado.ts`: convierte publicaciones seleccionadas en
  `ObservacionMercado`, **deduplica** por `fuente+itemId`/URL, y calcula antigüedad
  (`estaDesactualizada`).
- El precio propio **nunca** entra en la muestra.

### 2.3.bis Backend propio: contrato propuesto
El frontend nunca habla con `api.mercadolibre.com`. Llama a un backend propio:

```
GET {baseUrl}/market/search?q=<texto>&site=MLA&limit=<n>&zipCode=<opcional>
200 ->
{
  "estado": "ok" | "sin_resultados" | "insuficiente" | "limite" | "no_disponible" | "error",
  "fuente": "mercadolibre",
  "consultadoEn": "ISO-8601",
  "total": 123,
  "mensaje": "texto opcional para el usuario",
  "publicaciones": [
    {
      "itemId": "MLA123456789",
      "productId": "MLA18500844",
      "titulo": "...",
      "precio": 12345.67,
      "moneda": "ARS",
      "url": "https://articulo.mercadolibre.com.ar/MLA-...",
      "vendedor": "NICKNAME",
      "condicion": "nuevo",
      "envio": { "tipo": "gratis" | "pago" | "desconocido", "costo": 1234.5 },
      "disponible": true,
      "consultadoEn": "2026-10-19T12:00:00.000Z"
    }
  ]
}
```

El backend traduce a este contrato (él conoce los endpoints de ML, el OAuth y los límites). El
frontend queda desacoplado de cambios de ML.

### 2.3.3 Backend: por qué es obligatorio
- OAuth requiere `client_secret` (secreto) y guardar `refresh_token`. Si se pone en el frontend,
  se filtra. **Por eso la integración no puede hacerse solo en Angular.**

### 2.3.4 Fusionar con lo existente
- `ObservacionMercado` (manual) ya se usa para `calcularEstadisticasMercado` y en el detalle/riesgo.
- La búsqueda automática **produce el mismo tipo**; el usuario puede revisar/excluir y luego
  confirmar. Se agrega `origen: 'auto' | 'manual'`, `fuente` y `refExternaId` para distinguir
  auto vs manual y evitar duplicados.

### 2.3.5 Deduplicación y equivalencia
- Dedupe por `itemId`/`url`.
- Equivalencia: **no** se asume por nombre similar (regla de negocio existente). El filtro es
  manual: el usuario marca/desmarca resultados. La búsqueda por `q` + marca/modelo acota, pero la
  validación final es humana.

### 2.3.6 Caducidad
- Cada publicación guarda `consultadoEn`. La UI advierte si supera un umbral
  (configurable, por defecto p. ej. 7 días).

---

## 3. Archivos a crear / modificar

### Implementado (seguro, sin credenciales) — Fase A
- **Nuevo** `src/app/core/models/mercado.model.ts`.
- **Nuevo** `src/app/domain/market/fuente-mercado.ts` (puerto + estados).
- **Nuevo** `src/app/domain/market/observaciones-mercado.ts` (mapeo, dedupe, caducidad).
- **Nuevo** `src/app/data/adapters/fuente-mercado-http.ts` (adaptador real contra el contrato §2.3.bis;
  si no hay `baseUrl` → `no_configurado`; `FuenteMercadoNula` = sin fuente).
- **Nuevo** `src/app/data/mercado-store.service.ts` (signals + `FUENTE_MERCADO` + `MERCADO_BASE_URL`).
- **Nuevo** `src/app/features/productos/busqueda-mercado.component.ts` (panel de búsqueda).
- **Modificado** `src/app/app.config.ts`: `provideHttpClient()` + provisión de `MERCADO_BASE_URL` y
  `FUENTE_MERCADO`. La URL del backend se lee de `globalThis.__REVENTA_MERCADO_BASE_URL__` (por
  defecto `null` → "no configurado"). No contiene secretos.
- **Modificado** `src/app/features/productos/producto-form.component.ts/html`: montado el panel en la
  sección "4) Precios…" y las seleccionadas se vuelcan a `observaciones` (con dedupe).
- **Modificado** `src/app/core/models/producto.model.ts`: `ObservacionMercado` admite campos opcionales
  `origen` (`manual`/`auto`), `fuente` y `refExternaId` (compatibles con datos existentes).
- Specs nuevas: `observaciones-mercado.spec.ts`, `fuente-mercado-http.spec.ts`,
  `mercado-store.service.spec.ts`, `busqueda-mercado.component.spec.ts`.

### Pendiente
- **Opcional** `src/app/core/models/configuracion.model.ts` y `configuracion-store.service.ts`:
  guardar `mercado.baseUrl` desde la UI en lugar de la variable global.
- **Conectar** el frontend al backend real (definir `globalThis.__REVENTA_MERCADO_BASE_URL__`).
- **Credenciales**: crear app ML y autorizar OAuth (ver §5.4). Hasta entonces, estado "no configurado".

---

## 4. Qué puede implementarse ahora vs qué necesita al usuario

**Implementado y verificado con simulaciones:** frontend (Fase A) + backend NestJS (`backend/`) con
fuente simulada en pruebas. **No** se probó contra la API real (faltan credenciales).

### Lo que necesita el usuario (detenerse acá)
Ver §5.4 (pasos manuales y variables de entorno).

---

## 4.1 Plan de pruebas
- Dominio: mapeo `PublicacionMercado` → `ObservacionMercado`; dedupe por ítem/url; caducidad;
  no incluir precio propio.
- Adaptador HTTP: respuesta válida; `sin_resultados`; `insuficiente`; `429` → `limite`;
  `5xx`/red → `no_disponible`; JSON inválido → `error`; sin `baseUrl` → `no_configurado`.
- Store: buscar, seleccionar/deseleccionar, limpiar, conteos, reintento.
- Componente: estado no configurado; resultados con enlaces; incluir/excluir; advertencia de
  desactualización; no presentar vacío como real.
- Regresión: los tests actuales siguen verdes (hoy **199 tests / 30 archivos**); build de producción OK.

## 4.2 Riesgos
- **Credenciales/tokens**: el `refresh_token` es de un solo uso; hay que persistirlo y rotarlo bien.
- **Rate limit (429)**: requiere backoff y caché; sin esto, la fuente se bloquea.
- **Cobertura de la fuente**: `/sites/MLA/search` devuelve publicaciones activas de terceros según
  filtros; `/products/{id}` da solo el ganador del buy box (no todos los vendedores). La "muestra"
  puede ser parcial; se informa cantidad encontrada vs usada.
- **Equivalencia de producto**: resultados pueden no ser el mismo producto; el filtro es manual.
- **Condiciones de uso**: no scraping; usar API oficial y respetar límites.
- **Costo de infra**: el backend tiene costo de hosting; no hay costo documentado por request.
- **Datos desactualizados**: cada observación guarda fecha y se advierte.

## 4.3 Criterio de éxito
- Buscar por nombre/marca/modelo, ver resultados con enlace, incluir/excluir, calcular estadísticas
  y alimentar análisis financiero. Respaldo manual. No presentar vacío/error como real.

---

## 5. Backend NestJS (implementado, sin conectar aún)

Proyecto Node/NestJS **independiente** del frontend, en la carpeta `backend/`. Resguarda los secretos
de Mercado Libre y expone el contrato propio. **No** se probó contra la API real (faltan credenciales).

### 5.1 Estructura (mínima)
```
backend/
  package.json            (NestJS 11 + TypeScript; scripts: build, start, start:env, test)
  tsconfig.json / tsconfig.build.json
  .env.example            (plantilla SIN secretos)
  .gitignore              (node_modules, dist, .env, token store)
  src/
    main.ts               (bootstrap; CORS configurable)
    app.module.ts
    config/mercado.config.ts        (lectura y tipado de variables de entorno)
    mercado/
      contrato.ts                   (tipos que coinciden con el frontend)
      fuente-mercado.port.ts        (puerto FuenteMercadoBackend + token FUENTE_MERCADO)
      mercado.module.ts            (providers: config, fetch, fuente, token, service, guard)
      mercado.controller.ts        (GET /market/search; validacion de q, site_id, limit)
      mercado.service.ts           (normaliza y aplica limites)
      limite-consultas.guard.ts    (limite por IP/minuto, configurable; 429)
      oauth/token.service.ts       (OAuth: access/refresh, rotacion, persistencia 600)
      adapters/mercadolibre.fuente.ts (API oficial /sites/{site}/search)
  test/                    (47 pruebas; fuente y fetch simulados + CLI OAuth local)
```
- `GET /market/search?q=&site_id=&limit=` → devuelve el contrato de `./contrato` (idéntico al que
  consume el frontend). Parámetros inválidos → HTTP 400.
- Se usa **`fetch` nativo** de Node 22 (sin dependencias HTTP extra) y **NestJS 11** en CommonJS
  (NestJS 12 es ESM-only, lo que complicaba Jest; no se cambió nada más de versiones).

### 5.2 Manejo de errores y estados
- Sin credenciales → `no_configurado`. `400/401` de ML → `error` (credenciales). `429` → `limite`.
  `5xx`/red/timeout → `no_disponible`. JSON inesperado → `error`. Sin resultados → `sin_resultados`.
- El `access_token`/`refresh_token`/`client_secret` nunca aparecen en la respuesta ni en los logs
  (hay pruebas que interceptan `console` y `process.stdout`/`stderr`).
- El `refresh_token` rotativo se persiste en `MERCADO_TOKEN_STORE`, fuera del repo.
- **Una respuesta OAuth inválida o incompleta NUNCA sobrescribe un token válido** (se valida el
  `access_token` antes de tocar estado y, si falta el `refresh_token`, no se persiste).
- **Renovación single-flight**: llamadas concurrentes comparten una sola renovación. Como el
  `refresh_token` de ML es de **un solo uso y rota**, dos renovaciones paralelas provocarían
  `invalid_grant` y romperían la cadena.

### 5.3 Estado de pruebas
- Backend: `npm test` → **68 pruebas en verde** (9 suites): servicio de mercado, token, adaptador ML,
  controlador de mercado, CLI OAuth local y la capa de IA (config, adaptador Gemini, servicio, controlador).
- `npm run build` (tsc) → OK.
- Frontend (sin cambios de comportamiento): **199 tests / 30 archivos** en verde; build de producción OK.

### 5.4 Variables de entorno (`backend/.env`, ver `.env.example`)
| Variable | Obligatoria | Descripción |
|---|---|---|
| `MERCADO_CLIENT_ID` | Sí (para conectar) | App ID de la aplicación ML. |
| `MERCADO_CLIENT_SECRET` | Sí (secreto) | Secret Key. **Solo** en el backend. |
| `MERCADO_REFRESH_TOKEN` | Sí (o el store) | Refresh token inicial obtenido al autorizar. |
| `MERCADO_API_BASE` | No | default `https://api.mercadolibre.com` |
| `MERCADO_SITE_ID` | No | default `MLA` (Argentina) |
| `MERCADO_TOKEN_STORE` | No | default `.mercado-token.json` (permisos POSIX 600; ver 5.5) |
| `MERCADO_MAX_RESULTADOS` | No | default 50 |
| `MERCADO_TIMEOUT_MS` | No | default 8000 |
| `MERCADO_REQ_POR_MINUTO` | No | default 60 |
| `MERCADO_CORS_ORIGIN` | No | default `http://localhost:4200` |
| `PORT` | No | default 3000 |
| `IA_PROVEEDOR` | No | `ninguno` (default) o `gemini`. Ver §6. |
| `GEMINI_API_KEY` | Sí (para usar IA) | API key de Google AI Studio. **Secreto: solo en el backend.** |
| `GEMINI_MODELO` | No | default `gemini-2.5-flash` |
| `GEMINI_BUSQUEDA_WEB` | No | default `true` (Grounding with Google Search) |
| `GEMINI_API_BASE` | No | default `https://generativelanguage.googleapis.com` |
| `IA_TIMEOUT_MS` | No | default 60000 |

### 6. Capa de IA (resumen de precios) — Gemini

**Idea**: la IA **no** trae precios por sí sola ni los inventa (BIBLIA.md:41). Su único rol es
**resumir y agrupar** publicaciones que **ya** trajo una fuente real, citando sus fuentes.

- **Flujo**: fuente real de precios (Mercado Libre, o el traer-datos que se configure) → `PublicacionMercado[]`
  → `POST /ia/resumir` → Gemini resume → el dominio calcula la mediana sobre los datos citados.
- **Por defecto desactivada** (`IA_PROVEEDOR=ninguno`). Sin configurar, la app funciona igual y responde
  `no_configurado` sin inventar nada (verificado con prueba de humo real).
- **Proveedor implementado**: Gemini (`gemini-2.5-flash`) con *Grounding with Google Search*: el resumen se
  apoya en búsquedas reales y devuelve las URLs citadas (`groundingMetadata`).
- **Reglas del prompt** (`src/ia/prompt-resumen.ts`): no inventar precios/productos/URLs; si la lista es
  vacía o insuficiente, decirlo; no recalcular márgenes/impuestos (eso lo hace el dominio, no la IA).
- **Seguridad**: la API key se envía por header (`x-goog-api-key`), nunca en la URL; no aparece en
  respuestas ni en logs. El frontend jamás la ve.

#### 6.1 Endpoint `POST /ia/resumir`
- Cuerpo: `{ consulta: string, publicaciones: [{ id, titulo, precio, moneda, url, vendedor, condicion }] }`.
- Sanea y descarta publicaciones sin título o sin precio válido (> 0). Máximo 50 publicaciones por pedido.
- Respuesta (`ResumenIa`): `{ proveedor, resumen, fuentes[], idsAgrupados[], estado, mensaje }`.

#### 6.2 Cómo probar la IA (gratis, con Gemini)
1. Crear una API key en `https://aistudio.google.com/apikey` (gratis, sin tarjeta).
2. Copiar `backend/.env.example` a `backend/.env` y completar:
   ```
   IA_PROVEEDOR=gemini
   GEMINI_API_KEY=AIza...tu_key
   GEMINI_MODELO=gemini-2.5-flash
   GEMINI_BUSQUEDA_WEB=true
   ```
3. `npm run build` y `npm run start:env`. Probar `POST http://localhost:3000/ia/resumir`.
4. El tier gratuito de Gemini da tokens sin costo y **500 búsquedas web/día**; el contenido se usa para
   mejorar productos de Google (no apto para datos sensibles; para producción, pasar a pago).

#### 6.3 Proveedores alternativos (referencia; no implementados)
- **OpenAI** (`web_search`): ~US$0,058 por producto (más caro que Gemini/Perplexity).
- **Perplexity Search API**: ~US$0,001–0,006 por búsqueda; sin tier gratuito.
- Cambiar de proveedor solo requiere un adaptador nuevo de `IAProvider`; el dominio no cambia.

> **Nota de honestidad**: la integración con Gemini **compila y pasa pruebas** (adaptador simulado).
> **No** se ha verificado todavía contra la API real de Google (requiere tu API key). No afirmar que la
> búsqueda web real funciona hasta hacer una llamada real con credenciales válidas.

#### 6.4 Verificación real con Gemini (2026-10-21)
Se hizo la **primera llamada real** contra la API de Gemini usando una API key válida del usuario:
- **Resumen sin grounding → OK y verificado**: `POST /ia/resumir` devolvió un texto que resume
  EXACTAMENTE los precios entregados (ej. "los precios oscilan entre ARS 71.999 y ARS 75.500..."), sin
  inventar datos. Confirma el rol de resumidor y el cumplimiento de BIBLIA.md:41.
- **Detalle de modelos**: la zona del usuario ya no admite `gemini-2.5-flash` (HTTP 404); los modelos
  vigentes son `gemini-3.x` (ej. `gemini-3.5-flash`). **Default actualizado** a `gemini-3.5-flash`.
- **Reintentos**: Gemini devuelve `503` de forma intermitente por saturación. Se agregó reintento
  configurable (`IA_REINTENTOS`, default 3) solo para 5xx; nunca para 4xx.
- **Hallazgo sobre grounding**: con *Grounding with Google Search* activado (`GEMINI_BUSQUEDA_WEB=true`),
  la API respondió **429 (límite)** en el tier gratuito tras pocas llamadas. La cuota de búsqueda web es
  **separada y muy baja** en gratis. Conclusión: **el grounding en tier gratuito no es viable** para uso
  real; el resumen normal de Gemini sí funciona. Para búsqueda real, activar facturación (5.000 gratis/mes
  con billing) o usar Perplexity.

> Advertencia de seguridad: durante la puesta a punto la API key se pegó por error en `.env.example`
> (archivo versionado) y en el chat. Se movió a `backend/.env` (ignorado por git) y **se recomienda
> regenerar la key**. `.env.example` quedó limpio.

### 5.3.bis Plan de pruebas del backend (ejecutado)
- Parámetros inválidos → 400 (incluye `q` vacío, `q` > 120 caracteres, `site_id` inválido, `limit`
  fuera de rango/no numérico); válidos → contrato 200.
- Sin resultados → `sin_resultados`; respuesta válida simulada → `ok`.
- HTTP 429 → `limite`; 401/403 → `error`; 5xx → `no_disponible`; red/timeout → `no_disponible`.
- Credenciales ausentes → `no_configurado`; credenciales inválidas → `CredencialesInvalidasError`.
- Respuesta inesperada de ML → `error`.
- Renovación single-flight: 3 llamadas concurrentes → 1 sola petición al servidor de tokens.
- Respuesta OAuth incompleta o con `refresh_token` vacío → no sobrescribe el store.
- Fallo de escritura del store → no rompe la renovación (sigue en memoria) y avisa por log.
- `code_verifier` se incluye en el canje cuando la app tiene PKCE.
- Límite por minuto del backend → 429.
- Los secretos no aparecen en logs (console + stdout/stderr) ni en la respuesta.

### 5.4.bis Pasos manuales para conectar (requiere tu intervención)
1. Crear una aplicación en `https://developers.mercadolibre.com.ar` (país Argentina). Anotar
   **App ID** y **Secret Key** y registrar un **redirect URI** (puede ser uno local, p. ej.
   `https://localhost/callback`). El `redirect_uri` no admite información variable.
2. Generar la URL de autorización (con un `state` aleatorio e irrepetible):
   `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=$APP_ID&state=$STATE&redirect_uri=$REDIRECT_URI`.
   Si la app tiene **PKCE** habilitado, agregar `code_challenge` y `code_challenge_method=S256` y
   guardar el `code_verifier`.
3. Canjear el `code` por tokens en `POST https://api.mercadolibre.com/oauth/token`
   (`grant_type=authorization_code`, `client_id`, `client_secret`, `code`, `redirect_uri` y, con PKCE,
   `code_verifier`). El backend ya sabe hacerlo (`TokenService.canjearCodigoAutorizacion`) y
   **persiste el `refresh_token`** (rotativo, de un solo uso).
4. Configurar el backend: copiar `.env.example` a `.env` y completar `MERCADO_CLIENT_ID`,
   `MERCADO_CLIENT_SECRET` y `MERCADO_REFRESH_TOKEN`. **No** pegar secretos en el chat ni en el repo.
5. Levantar el backend: `npm run build` y `npm run start:env` (o `node --env-file=.env dist/main.js`).
6. Apuntar el frontend al backend: definir `window.__REVENTA_MERCADO_BASE_URL__ =
   'http://localhost:3000/market/search'` (o configurarlo en `app.config.ts`).
7. Recién entonces, probar una búsqueda real y confirmar contra la API real (aún **no** verificado).

> **Decisión pendiente de tu confirmación**: ¿la aplicación de Mercado Libre tiene **PKCE**
> habilitado? Si sí, hay que enviar `code_challenge`/`code_challenge_method` al autorizar y
> `code_verifier` al canjear (el backend ya lo soporta). Si no, se omite.

### 5.5 Riesgos / decisiones
- **Rotación del refresh token**: ML solo acepta el último `refresh_token`; es de un solo uso. Si el
  proceso se reinicia sin haber persistido el token rotado, el archivo queda con un valor ya inválido
  y hay que reautorizar. Mitigaciones: escritura **atómica** (temporal + rename), renovación
  **single-flight** y aviso por log si falla la persistencia.
- **Permisos del archivo (Windows)**: el `mode: 0o600`/`chmod` no controla las ACL en Windows; el
  permiso efectivo depende de la carpeta. Para producción, usar un almacén de secretos del entorno de
  hosting. No se agregó DB (fuera de alcance).
- **Rate limit de ML**: el backoff/caché avanzado no está implementado. Hay límite local por IP/minuto;
  si ML responde 429 se informa `limite`.
- **Endpoint sin autenticación**: `GET /market/search` no exige credenciales de usuario (solo consulta
  datos públicos de ML). Su único resguardo es el límite por IP/minuto. Antes de exponerlo
  públicamente conviene agregar autenticación/allowlist y `trust proxy` correcto para que `req.ip`
  sea real.
- **Cobertura**: solo se consulta `/sites/{site}/search`; no se integran envío por CP ni catálogo PDP.
