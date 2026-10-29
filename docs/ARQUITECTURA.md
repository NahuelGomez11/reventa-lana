# ARQUITECTURA.md

## Visión general
Aplicación frontend Angular desacoplada, con un **backend de integración de mercado** (NestJS,
independiente) que resguarda las credenciales de Mercado Libre. Preparada además para backend de datos
NestJS + MySQL + Prisma + Firebase Auth + IA intercambiable (sin integrar aún esos servicios).

## Frontend
- Angular (standalone components)
- TypeScript estricto
- Tailwind CSS
- Signals (cuando aporten valor)
- Formularios reactivos
- Lazy loading de rutas
- Componentes pequeños, reutilizables
- Layout principal
- Navegación real

## Organización
- `src/app/core/`: modelos, tipos, utilidades, constantes, configuración, manejo errores.
- `src/app/domain/`: lógica de negocio pura (motor financiero, reglas, validaciones). Sin dependencias Angular.
- `src/app/features/`: módulos/pantallas por feature (dashboard, productos, proveedores, calculadora/analisis, mercado, simulador, riesgo).
- `src/app/shared/`: componentes UI reutilizables, pipes, directivas.
- `src/app/data/`: adaptadores, repositorios, mocks/desarrollo. Mocks claramente identificados.
- `src/app/infrastructure/`: preparativo para integraciones (no conectar aún).

Separación clara presentación/dominio/acceso datos/integraciones.

## Backend de integración de mercado (NestJS)
Proyecto Node/NestJS **independiente** del frontend (carpeta `backend/`). Resguarda los secretos de
Mercado Libre (OAuth) y expone un contrato propio; el frontend nunca llama a `api.mercadolibre.com`.
- `GET /market/search?q=&site_id=&limit=` → `{ estado, fuente, consultadoEn, total, mensaje, publicaciones[] }`.
- Puertos/piezas: controlador HTTP, servicio de búsqueda (dominio) y **adaptador de fuente** (Mercado
  Libre) intercambiable detrás de una interfaz, para poder simularlo en pruebas.
- Manejo explícito de estados: `ok | sin_resultados | insuficiente | no_configurado | no_disponible |
  limite | error`; nunca inventa datos.
- OAuth: `client_secret`, `access_token` y `refresh_token` solo en el backend; refresh token rotativo
  persistido; sin secretos en logs ni respuestas.
- Config por variables de entorno, sin valores secretos en el repo.
- Sin base de datos ni auth de usuarios en esta etapa (no son imprescindibles).
Contrato y detalles en `docs/INTEGRACION_MERCADO.md`.

## Backend futuro (datos)
NestJS + Node.js. Fuente de verdad para cálculos persistidos y reglas. Front desacoplado vía interfaces.

## Persistencia futura
MySQL + Prisma. Migraciones controladas. Nunca ejecutar migraciones destructivas sin autorización.

## Autenticación futura
Firebase Auth. No implementar ahora.

## IA (capa de resumen) — backend
Proveedor intercambiable detrás de interfaz propia (`IAProvider`, implementada en el backend).
- **Rol acotado**: la IA es un *resumidor*, no una fuente de datos. Recibe publicaciones reales
  (con URL) que ya trajo la fuente de mercado y devuelve un resumen en texto + fuentes citadas.
- **Nunca** inventa precios, recalcula finanzas ni modifica datos originales (BIBLIA.md:41).
- Si no está configurada, responde `no_configurado` y no inventa nada (adaptador desactivado por defecto).
- La API key vive **solo** en el backend (`GEMINI_API_KEY`); jamás se expone al frontend ni en logs.
- Proveedor por defecto: **`ninguno`**. Proveedor implementado: **Gemini** (`gemini-2.5-flash`) con
  *Grounding with Google Search* (búsqueda real con fuentes).
- Endpoint: `POST /ia/resumir` (recibe publicaciones normalizadas; devuelve `ResumenIa`).
- Cambiar de proveedor no toca el dominio: solo se implementa otro adaptador de `IAProvider`.

Detalle de configuración y límites en `docs/INTEGRACION_MERCADO.md`.

## Estado, datos y precisión
- Estado local claro. Datos ficticios marcados.
- Precisión: evitar igualdad decimal; preferir centavos o `toFixed` controlado + validación con epsilon.
- Adaptador demostración desacoplado si no hay backend.

## Pruebas
- Unitarias: motor financiero, reglas, validadores (Jest/Karma según Angular). Definir comando.
- Integración ligera futura.
- E2E futuro.

## Seguridad y configuración
- Entornos sin secretos (`environment.ts` no debe contener claves reales).
- No guardar secretos en repo.
- No exponer datos sensibles en logs.
- Config centralizada.

## PWA y rendimiento
- Preparado para PWA (Angular service worker evaluado según versión).
- Lazy loading, code splitting, evitar deps innecesarias.
- Caché segura; no cachear info privada/financiera sensible indiscriminadamente.
- Estados carga/error, responsive, accesibilidad.
- No afirmar offline completo sin verificar.

## Evolución
Mantener arquitectura para migrar cálculos/datos a backend sin reescribir UI.
