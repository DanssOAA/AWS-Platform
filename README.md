# CloudOps Dashboard

## Descripción

Aplicación académica para planificar una arquitectura AWS, estimar costos y explicar decisiones de seguridad, disponibilidad y redes. Conserva el proyecto React + TypeScript + Vite existente. Supabase es el único backend; no se incorpora una API Express, Node o .NET.

Los recursos AWS, identidades IAM, latencias y tarifas son simulaciones educativas. Las propuestas y escenarios guardados utilizan datos reales de Supabase. El asistente consulta la Edge Function existente; no genera respuestas simuladas cuando falla Gemini.

## Situación problemática

La planificación de una solución Cloud suele fragmentarse entre formularios, cálculos y diagramas. Esta separación dificulta relacionar requisitos, servicios, inversión y controles de seguridad durante una exposición técnica.

## Objetivo

Centralizar la planificación y el análisis de una arquitectura web en una interfaz comprensible, con sesiones reales, persistencia por usuario y evaluación local de sus decisiones.

## Solución propuesta

Un espacio de trabajo con una propuesta activa, presupuesto editable, diagrama de tres capas, controles de seguridad y asistencia educativa con IA. Cada usuario consulta sus propuestas mediante políticas RLS de Supabase.

## Tecnologías

React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide React, Supabase Auth/Postgres/Edge Functions, Gemini y despliegue estático en Vercel. Vitest y Testing Library verifican los flujos críticos.

## Arquitectura de la aplicación

```text
React + React Router
  ├─ Login (correo) → cloudops-request-otp → envío del código
  │                     └─ solo cuentas CloudOps administradas y solicitudes aprobadas
  ├─ Solicitar acceso → cloudops-request-access → solicitud pendiente
  ├─ Admin → cloudops-manage-access → alta administrada / aprobación → OTP
  ├─ Login (código) → auth.verifyOtp({ email, token, type: 'email' })
  ├─ AuthContext → getSession / onAuthStateChange → ProtectedRoute
  ├─ AppContext → propuestas / presupuesto / controles del escenario
  ├─ Supabase Data API + RLS → cloudops_proposals / cloudops_cost_snapshots
  ├─ ArchitectureScore → reglas locales, sin IA
  └─ CloudAssistant → cloud-assistant → Gemini
```

La URL es la fuente de navegación. Al actualizar una ruta se restaura la sesión. El escenario de trabajo (costos, controles, región y propuesta seleccionada) se conserva como caché local independiente por `user.id`; las propuestas se vuelven a consultar en Supabase. El historial de propuestas y los escenarios guardados se almacenan en la base de datos. Cambiar de usuario desmonta el estado anterior.

Seleccionar una propuesta recupera su región y crea un presupuesto inicial con sus servicios. Editar el presupuesto no modifica la propuesta registrada: permite explorar alternativas de costos. Vaciar el dashboard desactiva la propuesta y limpia el presupuesto, conservando el historial. Restaurar datos carga el ejemplo académico sin sobrescribir propuestas guardadas.

## Módulos y cómo probarlos

| Módulo | Ruta / acción | Resultado esperado |
| --- | --- | --- |
| Login | `/login`, solicitar código e ingresar el recibido | Solicita mediante `cloudops-request-otp` y verifica con Supabase Auth. El paso del código aparece solo tras `success: true`; conserva el formulario ante errores. |
| Dashboard | `/dashboard` | Propuesta activa, región del escenario, usuarios estimados, disponibilidad objetivo, servicios, costos y controles. |
| Planificación Cloud | `/planning`, completar y registrar | Inserta `user_id` y los campos de la propuesta en Supabase. El historial se recupera al actualizar; «Activar propuesta» actualiza el escenario. |
| Costos | `/costs`, cambiar cantidad y horas | Recalcula mensual/anual y distribución; IAM/VPC conservan tarifa base cero. «Guardar escenario» inserta el JSON del presupuesto. Se conserva exportación CSV. |
| Infraestructura Global | `/infrastructure`, seleccionar región | Cambia región y muestra ubicación y servicios planificados. Catálogo de 34 regiones AWS, mapa con enlaces discontinuos animados, zoom, filtros y detalle de zonas de disponibilidad. No despliega recursos. |
| Seguridad | `/security`, alternar MFA, cifrado, base privada y cumplimiento | Cambian indicadores y score. Rotar claves es una simulación explícita. |
| Arquitectura de Red | `/network`, seleccionar elementos | Detalle de Internet, Route 53, CloudFront, VPC, ALB, EC2, RDS y las tres subredes. La simulación señala componentes ausentes. |
| Servicios AWS | `/services`, buscar y filtrar | Catálogo con función, categoría, detalles y estado en el presupuesto; permite agregar o quitar servicios. |
| Asistente Cloud IA | Botón flotante, elegir enfoque o escribir pregunta | Invoca `cloud-assistant` con región, propuesta, servicios, costos, seguridad y red. Muestra análisis, score, riesgo, recomendaciones y explicación, o el error recibido. |
| Navegación / sesión | F5 en `/costs`, luego cerrar sesión | Conserva ruta con sesión; sin sesión las rutas protegidas llevan a `/login`. |
| Responsive / tema | Probar 390, 768 y 1440 px; alternar tema | Sidebar móvil desplegable, formularios y tarjetas adaptables; tema persistente. Requiere comprobación visual en navegador. |

La puntuación local utiliza diez reglas de igual peso para una arquitectura web de tres capas: VPC, Route 53, CloudFront, EC2, RDS, alta disponibilidad, MFA, cifrado, base privada y cobertura del presupuesto. No equivale a una certificación ni al score que devuelve Gemini.

## Autenticación OTP y compatibilidad con FaceIA

El proyecto comparte Supabase Auth con FaceIA. El frontend **no invoca `signInWithOtp` ni realiza altas públicas**. La creación o recuperación administrada de usuarios corresponde a `cloudops-manage-access` después de validar al administrador. `cloudops-request-otp` envía códigos únicamente a cuentas CloudOps administradas, sin crear usuarios. Las protecciones existentes sobre `auth.users` y los metadatos de FaceIA se conservan.

`AuthContext.requestOtp(email)` solicita el código:

```ts
const { data, error } = await supabase.functions.invoke('cloudops-request-otp', {
  body: { email }
})
```

Solo con `data.success === true` se muestra el segundo paso. Las respuestas fallidas, errores HTTP y problemas de conexión muestran su mensaje sin simular éxito ni abrir el dashboard.

`AuthContext.verifyOtp(email, code)` verifica directamente con Supabase:

```ts
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token: code,
  type: 'email'
})
```

La navegación a `/dashboard` requiere `data.session`. No se llama a `auth.setSession` con tokens devueltos por la función de solicitud. Se conservan `getSession`, `onAuthStateChange`, `ProtectedRoute` y `auth.signOut()` para restaurar, proteger y cerrar la sesión.

El login permite reenviar mediante la misma Edge Function, con un contador de 60 segundos después de cada intento de envío. Durante una solicitud se bloquean envíos duplicados y cambios de correo. «Cambiar correo» vuelve al primer paso y limpia el código; el contador del mismo correo se conserva mientras la pantalla permanece montada. La espera de la interfaz no sustituye los límites de envío del servidor.

El correo se normaliza y queda fijo durante la verificación para que el código no se aplique por accidente a otra dirección. Los códigos inválidos o expirados conservan el formulario y permiten reintentar o solicitar uno nuevo.

Referencia oficial: [verificación OTP de Supabase](https://supabase.com/docs/reference/javascript/auth-verifyotp).

La implementación anterior `supabase/functions/cloudops-auth` se conserva como código histórico y no es invocada por el login actual. Sus secretos de código compartido no son requisitos del flujo OTP. La migración del contador también protege las nuevas solicitudes públicas. No desplegarla como solución al bloqueo de altas de FaceIA.

## Base de datos Supabase

| Tabla | Uso |
| --- | --- |
| `cloudops_proposals` | Historial del usuario: nombre, aplicación, descripción, región, usuarios, disponibilidad, servicios y objetivo. |
| `cloudops_cost_snapshots` | Escenarios: `user_id`, `monthly_cost`, `annual_cost` y `detail` JSON. |
| `cloudops_ai_history` | La función existente `cloud-assistant` intenta registrar las consultas y respuestas. |
| `cloudops_profiles` | Tabla existente disponible para ampliar perfiles; el header utiliza el email de Auth. |
| `cloudops_workspaces` | Tabla existente reservada para sincronizar escenarios entre dispositivos; esta versión mantiene el borrador en caché local por usuario. |
| `cloudops_auth_attempts` | Contador exclusivo del servidor: limita solicitudes públicas y solicitudes OTP. |
| `cloudops_access_requests` | Solicitudes pendientes, aprobadas y rechazadas. Lectura exclusiva para administradores mediante RLS; escritura exclusiva desde las Edge Functions. |

Las cinco tablas originales ya existen en el proyecto conectado y tienen RLS con restricciones por `auth.uid() = user_id`. El frontend filtra también por usuario. No se reemplaza el esquema existente. La nueva función SQL usa `SECURITY INVOKER`, tiene permisos revocados para `anon`/`authenticated` y requiere `service_role`.

## Instalación

```bash
npm install
npm run dev
```

El servidor debe usar `http://localhost:5173` para coincidir con CORS de la función `cloud-assistant` existente.

### Variables del frontend

Crear `.env.local` a partir de `.env.example`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

En el workspace de entrega ya se configuraron la URL y la clave pública proporcionada. `.env.local` está excluido de Git. Reiniciar Vite tras cambiar variables. Nunca agregar `service_role`, `SUPABASE_SERVICE_ROLE_KEY`, códigos ni claves Gemini a variables `VITE_*`.

### Solicitudes de acceso y aprobación

`/request-access` es pública. El formulario envía `{ email }` a `cloudops-request-access` y muestra la confirmación solamente con `success: true`. No crea usuarios ni envía OTP. La dirección se normaliza y es única: las solicitudes duplicadas no sobrescriben una decisión ni revelan su estado al público.

`/admin/access-requests` requiere sesión y `user.app_metadata.cloudops_role === 'admin'`; otras cuentas vuelven al dashboard. El menú Administración solo aparece con ese rol. El listado consulta `cloudops_access_requests`, protegido por RLS, y permite filtrar Pendiente (amarillo), Aprobado (verde) y Rechazado (rojo), con 25 resultados por página.

`cloudops-manage-access` recibe `{ requestId, action: 'approve' | 'reject' }`. Valida el JWT con `auth.getUser(token)` y comprueba el rol en los metadatos administrados actuales, nunca en `user_metadata` ni en el cuerpo de la solicitud. Aprobar crea o recupera la cuenta, agrega `cloudops_managed: true` conservando los metadatos existentes, registra la aprobación y solicita OTP con `shouldCreateUser: false`. Rechazar solo registra el rechazo.

Una reserva atómica de la solicitud impide procesar simultáneamente aprobación y rechazo. La reserva caduca a los diez minutos si la función termina inesperadamente. Si el correo falla después de aprobar, la función devuelve el error real y el panel ofrece «Reintentar envío de código» en Aprobadas. Repetir una aprobación cuyo envío ya fue registrado no vuelve a enviar correo. Si el proveedor aceptó el correo pero falló el registro del envío, un reintento puede generar otro OTP; el proveedor sigue aplicando sus límites.

`cloudops-request-otp` conserva el contrato del login existente y permite a los usuarios previamente administrados seguir ingresando. Si hay una solicitud para el correo, debe estar aprobada. Las nuevas cuentas solo se crean al aprobar. Las solicitudes públicas tienen un límite de cinco intentos por correo y operación cada diez minutos y un máximo global de cien, mediante la migración del contador.

### Preparación de Supabase y despliegue

Los cambios están preparados en el proyecto; **las nuevas migraciones y funciones no se desplegaron en esta entrega**. La revisión remota encontró `cloudops-request-otp` activa, pero su versión desplegada todavía creaba cuentas automáticamente. Es necesario desplegar su actualización junto con el nuevo flujo. Una consulta remota adicional quedó bloqueada porque la revisión automática del workspace se quedó sin créditos.

1. Aplicar, en orden, las migraciones `supabase/migrations/20261005061211_cloudops_auth_rate_limit.sql` y `supabase/migrations/20261005120000_cloudops_access_requests.sql` usando el procedimiento de migraciones del proyecto compartido. Revisar su historial antes de usar `supabase db push`; no restablecer la base ni alterar los triggers de FaceIA. La migración de solicitudes es nueva y aún no tiene validación en Postgres real.
2. Asignar al primer administrador `app_metadata.cloudops_role = 'admin'` y `app_metadata.cloudops_managed = true` mediante una herramienta administrativa confiable de Supabase, conservando sus demás metadatos. Ninguna cuenta se convierte en administrador al solicitar acceso. Renovar su sesión después del cambio para actualizar el JWT usado por RLS.
3. Las funciones reciben `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY` del entorno de Supabase. Opcionalmente establecer `CLOUDOPS_ALLOWED_ORIGINS` con la lista completa de orígenes permitidos. No copiar secretos al frontend.
4. Desplegar únicamente estas tres funciones, sin `--prune` y sin tocar `cloud-assistant` ni funciones de FaceIA:

```bash
supabase functions deploy cloudops-request-access --project-ref nwpzaqzzrpwncpdanxbx --no-verify-jwt
supabase functions deploy cloudops-manage-access --project-ref nwpzaqzzrpwncpdanxbx --no-verify-jwt
supabase functions deploy cloudops-request-otp --project-ref nwpzaqzzrpwncpdanxbx --no-verify-jwt
```

`verify_jwt = false` permite invocación con la clave publicable. La función de administración **sí valida internamente el JWT de usuario y su rol antes de consultar o modificar solicitudes**. Los endpoints públicos validan entrada y límites del servidor.

5. Conservar la configuración actual del proveedor de correo de Supabase y la plantilla de OTP con `{{ .Token }}` y longitud de seis dígitos. No se agrega un backend ni un proveedor de correo externo.
6. Probar con cuentas de prueba: enviar solicitud; comprobar que OTP se bloquea antes de aprobar; aprobar y verificar el código en Login; rechazar otra solicitud sin alta ni correo; intentar acceder al panel y llamar a la función con un usuario normal. Confirmar que FaceIA y `cloud-assistant` continúan funcionando.

La función histórica `cloudops-auth` también sigue desplegada en el proyecto compartido y no fue modificada aquí. Antes de considerar la aprobación como el único modo de obtener acceso, revisar ese endpoint legado y su configuración de acceso por código: el frontend actual no lo utiliza, pero una función remota activa puede invocarse directamente.

Referencias oficiales: [creación administrativa de usuarios](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [solicitud OTP con shouldCreateUser](https://supabase.com/docs/reference/javascript/auth-signinwithotp) y [validación de usuario con Auth](https://supabase.com/docs/reference/javascript/auth-getuser).

### Asistente Gemini

La función `cloud-assistant` ya existe. Requiere `GEMINI_API_KEY` en sus secretos y un origen permitido por su CORS. El frontend no contiene la clave de Gemini. Si cambia el dominio de Vercel, actualizar también la lista de orígenes de esa función. No se ha confirmado una respuesta real de Gemini con una sesión de demostración en esta entrega.

## Build y pruebas

```bash
npm run build
npm run test
```

El build ejecuta TypeScript y genera `dist/`. Las pruebas automatizadas utilizan dobles de Supabase exclusivamente en `tests/`; la aplicación no incluye sesiones ni respuestas de IA simuladas.

Las pruebas cubren solicitud OTP por Edge Function, verificación directa, errores reales, respuesta sin sesión, bloqueo de envíos duplicados, reenvío tras 60 segundos, cambio de correo, restauración/cierre de sesión, rutas protegidas, reglas de seguridad, propietario de propuestas y escenarios con costo cero. También cubren solicitudes públicas, redirecciones y menú admin, permisos del servidor, aprobación/rechazo, fallos de correo, reintentos y conservación de metadatos de FaceIA. Se conservan pruebas del handler anterior de código compartido, que no participa en el login actual.

La migración anterior del contador se comprobó en una transacción real de Supabase: quinto intento permitido, sexto rechazado, reinicio tras diez minutos y permisos exclusivos de servidor. La transacción se revirtió y se confirmó que no dejó la tabla creada. Esto verifica el SQL, pero no equivale a desplegar la función.

El navegador integrado no estuvo disponible durante la implementación. La revisión visual en desktop/tablet/mobile y la prueba completa con una cuenta real están pendientes; no se generaron capturas ficticias.

## Despliegue Vercel

Importar el repositorio como proyecto Vite, usar `npm run build` y directorio de salida `dist`. Configurar ambas variables `VITE_SUPABASE_*` en los entornos necesarios y reconstruir el despliegue. `vercel.json` incluye la reescritura de rutas SPA para que F5 en `/planning`, `/costs` y demás rutas llegue a `index.html`.

La publicación del sitio no se realizó en esta entrega. Antes de exponer, completar la configuración de `cloudops-request-otp` y verificar el acceso desde el dominio final.

## Evidencias

Rutas previstas para capturas reales, pendientes de tomar tras completar la configuración:

| Pantalla | Archivo previsto |
| --- | --- |
| Login | `docs/screenshots/login.png` |
| Dashboard | `docs/screenshots/dashboard.png` |
| Planificación | `docs/screenshots/planning.png` |
| Costos | `docs/screenshots/costs.png` |
| Infraestructura | `docs/screenshots/infrastructure.png` |
| Seguridad | `docs/screenshots/security.png` |
| Red | `docs/screenshots/network.png` |
| Servicios | `docs/screenshots/services.png` |
| Responsive | `docs/screenshots/responsive.png` |

## Archivos de la entrega

**Creados:** cliente Supabase y tipos Vite; `AuthContext`; `ProtectedRoute`; Login; `ArchitectureScore`; reglas de arquitectura; `CloudAssistant`; catálogo acotado de iconos; `.env.example`; `.env.local` (ignorado); `vercel.json`; configuración y función `supabase/functions/cloudops-auth/index.ts` con su handler; plantilla de secretos; migración del contador; configuración Vitest y pruebas.

**Modificados:** `App.tsx`, `AppContext`, Sidebar, Header, componentes de servicios/costos/regiones/estados/notificaciones, páginas existentes, estilos globales, `.gitignore`, dependencias y lockfile, y este README.

**Configuración externa pendiente:** aplicar las migraciones, desplegar las funciones de solicitud/aprobación y actualizar `cloudops-request-otp`, asignar el primer administrador; comprobar recepción/verificación real y Gemini con sesión; configurar variables y CORS en Vercel si se publica; realizar revisión visual y capturas.

**Nuevo flujo de acceso:** `src/pages/RequestAccess.tsx`, `src/pages/admin/AccessRequests.tsx`, `src/routes/AdminRoute.tsx`, `src/lib/accessRequests.ts`, funciones `cloudops-request-access` / `cloudops-manage-access`, lógica compartida en `supabase/functions/_shared`, migración de solicitudes y pruebas de páginas, handlers y adaptador de Auth.

## Mapa de infraestructura

El mapa usa las 34 regiones de la partición AWS estándar, compartidas con los selectores de región de la aplicación. `src/data/awsRegions.ts` incluye códigos, área geográfica, requisitos de activación y AZ IDs. Fuentes revisadas el 5 de octubre de 2026: [regiones AWS](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html) y [zonas de disponibilidad](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-availability-zones.html). La tabla detallada de AZ IDs enumera cuatro zonas para Londres, aunque la tabla general de regiones todavía muestra tres; el detalle de zonas es la fuente utilizada aquí. Las cuentas nuevas pueden tener restricciones en California. China, GovCloud y European Sovereign Cloud quedan fuera de este catálogo.

Los puntos indican ubicaciones regionales aproximadas. Las AZs se muestran por identificador en un esquema regional, sin inventar coordenadas de centros de datos ni letras de zona de una cuenta. Los enlaces del mapa son referencias visuales, no rutas medidas de la red de AWS. Se conservan las estimaciones de latencia anteriores; las regiones nuevas muestran «Sin estimación».

El explorador permite buscar sin tildes, filtrar por área, ampliar hasta 4×, desplazar el mapa, ocultar enlaces y pausar el movimiento. Respeta `prefers-reduced-motion`. Inspeccionar una región permite consultar sus zonas; «Usar esta región» actualiza la planificación. Vaciar y restaurar conservan sus acciones anteriores.

La cartografía se sirve localmente desde `public/maps/world.svg`, generada a partir de los países de [Natural Earth 1:110m](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson), de dominio público. La proyección del mapa y de los marcadores es equirectangular; no se descargan imágenes externas al abrir la pantalla.

Las pruebas `tests/regions.test.tsx` cubren datos, proyección, conexiones por el Pacífico, filtros, selección de región, zonas, pausa de animaciones y las acciones existentes. La comprobación visual sigue pendiente porque el navegador integrado no estuvo disponible en esta sesión.
