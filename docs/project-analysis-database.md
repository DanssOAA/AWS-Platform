# Análisis de proyectos: implementación y Supabase

## Conexión confirmada

| Dato | Valor |
| --- | --- |
| Proyecto | DanssOAA's Project |
| Project ref | `nwpzaqzzrpwncpdanxbx` |
| Región | `us-west-2` |
| Motor | PostgreSQL 17 |
| Base PostgreSQL | `postgres` |
| URL API | `https://nwpzaqzzrpwncpdanxbx.supabase.co` |
| Host PostgreSQL | `db.nwpzaqzzrpwncpdanxbx.supabase.co` |

Tanto `.env.local` como `supabase/.temp/project-ref` apuntan a este proyecto. El identificador `cloudops-dashboard` en `config.toml` corresponde al entorno local.

[Dashboard](https://supabase.com/dashboard/project/nwpzaqzzrpwncpdanxbx) · [Editor SQL](https://supabase.com/dashboard/project/nwpzaqzzrpwncpdanxbx/sql/new)

## Estado

- Ruta protegida `/projects`, accesible desde «Análisis de proyectos», implementada en el frontend local.
- Nueve tablas y tres funciones SQL aplicadas al Supabase remoto.
- Edge Function `cloudops-analyze-project` desplegada y activa.
- La versión 3 simplificó el esquema solicitado a Gemini y registra errores del proveedor con credenciales redactadas. El siguiente intento real superó el HTTP 400, pero se rechazó por una cita que no coincidía con las fuentes.
- La versión 4 usa bloques de evidencia: Gemini devuelve un `evidence_id` y el servidor copia texto, fuente y ubicación del bloque original. Rechaza referencias inexistentes. No requiere reimportar fuentes ni migraciones; las nuevas ejecuciones registran `cloudops-project-v2-evidence-blocks` en `prompt_version`.
- La versión 5 asigna `deployment_order` en el servidor a partir del orden de la lista de servicios y registra `cloudops-project-v3-ordered-services`. El análisis real del 11/10/2026 a las 18:53 UTC quedó completado con 10 requisitos, 6 hallazgos y 9 recomendaciones. La función también atiende consultas del asistente con contexto leído desde la BD.
- La versión 6 añade reintentos con espera progresiva para HTTP 500/502/503/504 y errores de red, con tres intentos como máximo y un plazo compartido de 105 segundos. El fallo del 11/10 a las 14:00 (Lima) fue HTTP 503; ese mismo proyecto completó su siguiente análisis a las 14:05.
- Se restauraron las siete vistas originales, gráficos, mapa, formulario y editor de red. `AnalyzedAppProvider` adapta el análisis guardado a sus componentes; el informe se muestra como complemento desplegable. No se cargan identidades AWS ficticias. Un nuevo intento fallido conserva el último resultado válido.
- El prompt `cloudops-project-v5-global-costs` incluye rangos mensuales orientativos por servicio, región, base de cálculo y supuestos cuantitativos. Se guardan en `cloudops_aws_recommendations.suggested_configuration.cost_estimate`, con `kind: ai_estimate` y fecha. No se modifican las columnas reservadas a cotizaciones con referencia.
- La acción autenticada `estimate` completa solo las estimaciones faltantes de un análisis ya terminado. Se ejecuta automáticamente al abrir un análisis antiguo; conserva configuración, evidencia e historial. Si falla, muestra un reintento sin invalidar el informe. No requiere nuevas migraciones SQL.
- Las cotizaciones en curso, resultados y errores se gestionan por proyecto/análisis, independientes de las recargas y del selector. Cambiar de proyecto no descarta una respuesta tardía de cotización: se conserva para su propio proyecto, sin mezclarla con el visible. Las estimaciones completas se reutilizan; un intento fallido puede reintentarse automáticamente al regresar o mediante el botón de Costos. Una lectura anterior sin costos no sobrescribe las estimaciones recién recibidas.
- Verificación real: el usuario confirmó las gráficas e importes en localhost. En Supabase se comprobaron las nueve estimaciones de `Big-Data_Analitycs`: rango agregado USD 81.50–376.50/mes, incluidos servicios opcionales. Son resultados de IA, no tarifas comprobadas.
- Dos tablas adicionales guardan avance personal y conversaciones: `cloudops_analysis_tasks` y `cloudops_project_conversations`, aisladas por usuario, proyecto y análisis.
- Se confirmó por nombre que existe `GEMINI_API_KEY`, sin leer ni mostrar su valor.
- Modelo predeterminado: `gemini-2.5-flash`, el mismo del asistente anterior. Se puede configurar con `CLOUDOPS_GEMINI_MODEL`.
- `CLOUDOPS_ALLOWED_ORIGINS` ya existe. La prueba remota confirmó CORS para `http://localhost:5173`.
- Frontend compilado en `dist/`; no se publicó en Vercel en esta entrega.
- El usuario confirmó que el informe abre en localhost, y se verificó su estado completado y resultados en la BD. Pendiente: inspección visual en navegador de todos los módulos y una consulta real del nuevo asistente; las pruebas de este último usan respuestas controladas.

## Uso

1. Ejecutar `npm run dev`, ingresar con una cuenta CloudOps aprobada y abrir `/projects`.
2. Crear un proyecto con sus restricciones. Región, presupuesto, usuarios y disponibilidad pueden quedar sin definir.
3. Importar un repositorio público de GitHub, Google Docs accesible por enlace, archivo de texto en Drive, texto pegado o archivo local de texto UTF-8.
4. Revisar la cobertura, seleccionar entre una y tres fuentes importadas y pulsar «Analizar con Gemini».
5. Consultar el informe por pestañas: resumen, seguridad, servicios AWS, requisitos y plan de acción. Los hallazgos se pueden filtrar por severidad y los requisitos se pueden buscar.
6. Revisar evidencia, correcciones, requisitos vinculados a cada servicio, configuraciones de partida y supuestos. El informe sugiere un siguiente paso según los riesgos y requisitos inferidos de ese análisis.
7. Navegar por Dashboard, Planificación, Costos, Infraestructura, Seguridad, Red y Servicios. Todos usan automáticamente el mismo proyecto y análisis. El selector superior cambia todos los módulos. La preferencia de selección se recuerda por usuario en el navegador; los resultados provienen de Supabase.
8. Marcar tareas del plan y descargar el informe en Markdown o mediante «Descargar informe técnico PDF», ubicado arriba de los módulos y del informe. El PDF incluye contexto, requisitos, servicios/configuración, costos/supuestos, seguridad, plan, fuentes y evidencias. Se genera localmente con fuentes tipográficas incluidas; no vuelve a enviar datos a Gemini. El seguimiento se guarda en Supabase por usuario, proyecto y ejecución; no cambia los hallazgos ni certifica su resolución.
9. Abrir el asistente para consultar el proyecto. El servidor verifica que el análisis pertenece al usuario y proyecto, carga requisitos/hallazgos/servicios desde la BD y guarda pregunta y respuesta. El navegador envía identificadores y la pregunta, no un contexto de simulación.

Costos conserva barras, tarjetas, simulador, CSV y guardado del escenario. Los gráficos usan el punto medio del rango mensual; se incluyen inicialmente servicios opcionales. Cantidad/horas simulan cambios proporcionales con tarifa horaria equivalente, no precios reales de AWS. Los presupuestos guardados incluyen `projectId` y `analysisId`. Los servicios sin estimación quedan pendientes. Infraestructura conserva el mapa y las restricciones congeladas en `input_context`. Red inicia el editor con los servicios recomendados, admite tipos genéricos y conserva importar/exportar/deshacer; los borradores se separan por proyecto y análisis en localStorage. No inventa conexiones ni CIDR. La arquitectura de referencia sigue disponible como ejemplo separado. No hay telemetría, facturación o inventario de IAM conectado a AWS.

Una ejecución fallida muestra una explicación y un botón para reintentar con las fuentes seleccionadas, sin reimportarlas. Cada reintento crea una ejecución nueva y conserva el historial anterior.

Cada fuente admite hasta 60 KB. GitHub resuelve rama/tag/commit y toma hasta 12 archivos de máximo 12 KB cada uno, priorizando documentación y configuración. Omite dependencias, binarios y nombres de archivos de credenciales. La cobertura muestra qué se leyó; no es una auditoría completa del repositorio.

Google requiere texto exportable y acceso por enlace. Para documentos privados, PDF, DOCX o ZIP, exportar a TXT o pegar el texto. El módulo no cambia permisos de Google ni incorpora OAuth. Una reimportación de un enlace conserva la versión anterior.

Límites por usuario: 30 importaciones guardadas y 10 análisis iniciados por hora. Cada análisis recibe hasta 180 KB. Solo se permite uno activo por proyecto; un intento interrumpido se invalida al reintentar después de cinco minutos.

Las fuentes seleccionadas se envían a Gemini. Se eliminan patrones comunes de credenciales antes de almacenarlas, pero no se garantiza detectar todos los secretos: revisar el contenido antes de aportarlo.

## Modelo y permisos

| Tabla | Contenido |
| --- | --- |
| `cloudops_projects` | Propietario, nombre, descripción y restricciones propias. |
| `cloudops_project_sources` | Origen, enlace, etiqueta y referencia GitHub. |
| `cloudops_source_versions` | Texto limpio, hash SHA-256, revisión y cobertura. |
| `cloudops_project_analyses` | Modelo, prompt, contexto congelado, estado y resultado. |
| `cloudops_analysis_sources` | Versiones exactas usadas por cada análisis. |
| `cloudops_project_requirements` | Requisitos explícitos/inferidos con evidencia. |
| `cloudops_security_findings` | Hallazgos, severidad y corrección; inicialmente sin verificar. |
| `cloudops_aws_recommendations` | Servicios, justificación, configuración, alternativas y supuestos. |
| `cloudops_recommendation_requirements` | Requisitos atendidos por cada servicio del mismo análisis. |
| `cloudops_analysis_tasks` | Avance personal, editable por su propietario, separado de la evaluación de seguridad. |
| `cloudops_project_conversations` | Consultas y respuestas del asistente ligadas al proyecto y análisis; solo el servidor escribe. |

Las claves foráneas comprueban propietario, proyecto y análisis. RLS aísla los datos por usuario. El cliente autenticado administra sus proyectos y registra fuentes; solo el servidor escribe texto importado y resultados. Archivar conserva el historial; eliminar un proyecto elimina sus registros dependientes en cascada. No se alteraron Auth, FaceIA, tablas anteriores ni `cloud-assistant`.

Las RPC `cloudops_save_source_version`, `cloudops_begin_project_analysis` y `cloudops_finish_project_analysis` son `SECURITY INVOKER`, accesibles solo a `service_role`. Incrementan versiones bajo bloqueo, reservan cuota y guardan el resultado completo en una transacción.

## API

`POST /functions/v1/cloudops-analyze-project` exige JWT válido y `app_metadata.cloudops_managed === true`. Valida con `auth.getUser(token)`, verifica propiedad y restringe CORS.

```json
{ "action": "import", "projectId": "UUID", "sourceId": "UUID", "text": "Solo para texto o archivo local" }
```

```json
{ "action": "analyze", "projectId": "UUID", "versionIds": ["UUID"] }
```

Devuelve `{ success: true, versionId, sourceId, coverage }` al importar, o `{ success: true, analysisId }` al analizar. Los errores devuelven HTTP no exitoso y `{ success: false, error, analysisId }`.

El servidor construye las URLs desde identificadores validados, verifica destinos de redirección y limita tiempo/bytes. No ejecuta código importado ni proporciona herramientas a Gemini. Valida rangos, categorías, referencias de evidencia y asociaciones entre servicios y requisitos antes de guardar.

Las fuentes se dividen en bloques de hasta 1200 unidades UTF-16, preferentemente por salto de línea o espacio, sin cortar pares sustitutos. Se envían con identificadores y posiciones en el texto importado. Gemini selecciona esos identificadores; las citas y ubicaciones guardadas provienen del servidor. No se aceptan citas libres ni coincidencias aproximadas. La existencia del fragmento no garantiza que la interpretación de la IA sea correcta: esa relación requiere revisión humana.

Score nulo significa «Sin evaluar». El informe es orientativo y no certifica seguridad. Los costos de IA son estimaciones sujetas a verificación; no se despliegan recursos AWS. Las propuestas históricas se conservan en Planificación; no sustituyen automáticamente al proyecto analizado.

Las rutas vuelven a montar `Dashboard`, `Planning`, `Costs`, `Infrastructure`, `Security`, `NetworkPage` y `Services`. `ProjectModulePage` se conserva como vista alternativa y ya no sustituye las rutas principales.

El asistente usa la misma función autenticada:

```json
{ "action": "assist", "projectId": "UUID", "analysisId": "UUID completado", "question": "Pregunta de hasta 2000 caracteres" }
```

Devuelve `{ success: true, conversation }` únicamente después del guardado. Consulta un máximo de 20 conversaciones guardadas por hora y recupera las 10 más recientes del análisis para mostrarlas.

## Comandos

Desde PowerShell:

```powershell
Set-Location 'D:\SENATI LUNES 4\trabajo cloud'

# Solo si la CLI no tiene sesión:
supabase login

# Ya está vinculado; útil en otra instalación:
supabase link --project-ref nwpzaqzzrpwncpdanxbx

supabase migration list --linked

# Redesplegar únicamente esta función cuando se modifique:
supabase functions deploy cloudops-analyze-project --project-ref nwpzaqzzrpwncpdanxbx --no-verify-jwt

# Consultar nombres y metadatos de secretos, no sus valores:
supabase secrets list --project-ref nwpzaqzzrpwncpdanxbx
```

`--no-verify-jwt` evita la validación automática del gateway para compatibilidad con la clave publicable; **la función sí valida el JWT del usuario internamente**.

Estas migraciones ya están aplicadas; no volver a ejecutarlas:

- `20261011063113_cloudops_project_analysis.sql`
- `20261011064548_cloudops_analysis_workflow.sql`
- `20261011184943_project_workspace_state.sql`

El historial antiguo del Supabase compartido difiere del repositorio. Antes de usar un `supabase db push` general hay que reconciliarlo. No usar `db reset` ni `functions deploy --prune` para este módulo.

Para modificar secretos, usar un archivo local ignorado como `supabase/.env.local` y conservar todos los orígenes válidos en `CLOUDOPS_ALLOWED_ORIGINS`:

```powershell
supabase secrets set --env-file supabase/.env.local --project-ref nwpzaqzzrpwncpdanxbx
```

No colocar `GEMINI_API_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` en variables `VITE_*`. El runtime proporciona las credenciales Supabase a la función.

## Verificación

- Build de producción y comprobación TypeScript del backend.
- 212 pruebas Vitest: incluyen las vistas originales, datos de sus gráficos, precarga del formulario, editor de red, cambio de proyecto, guardado de presupuestos con IDs, generación PDF, descarga sin duplicados, reintentos 503, validación/persistencia de estimaciones y aislamiento de propietarios. La suite de costos reproduce ERP → Big Data → ERP durante el cálculo, actualización simultánea, errores recuperables, precios ya guardados y respuestas incompletas. Las pruebas de flujo cubren generación, persistencia, reutilización, requisitos/IDs válidos, servicios aislados, deshacer/rehacer, errores y respuestas tardías al cambiar de proyecto.
- PDF generado con un análisis real y renderizado página por página con PyMuPDF: tablas, tipografía española, paginación y límites de página revisados. La descarga usa jsPDF/AutoTable y carga diferida; fuentes Vera redistribuidas con su licencia.
- SQL real con rollback: RLS de las nueve tablas, permisos, relaciones, versiones, bloqueo de análisis duplicados, finalización atómica y rechazo de resultados inválidos.
- SQL real con rollback para las dos tablas nuevas: upsert y lectura del propietario, rechazo de tareas en análisis incompletos, aislamiento entre proyectos/propietarios, conversaciones solo escribibles por servidor y bloqueo de acceso anónimo.
- Endpoint remoto: anónimo → 401; token inválido → 401; preflight localhost → 204; origen ajeno → 403.
- Sin nuevos avisos de seguridad en los asesores del módulo. Persisten avisos anteriores sobre [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) y [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

```powershell
npm run build
npm run test
node node_modules/typescript/bin/tsc -p tsconfig.analysis.json
```

Los scripts de `supabase/tests/` son PL/pgSQL transaccional para SQL Editor o `execute_sql`, no pgTAP. Las pruebas Gemini usan respuestas controladas; no representan llamadas reales.

Referencias: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [Git trees](https://docs.github.com/en/rest/git/trees), [descargas Drive](https://developers.google.com/workspace/drive/api/guides/manage-downloads) y [salidas estructuradas Gemini](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).


La validación de costos admite códigos regionales AWS y `global` para IAM/CloudFront. El prompt comparte las reglas de importes, base de cálculo y supuestos. La acción `estimate` verifica estimaciones existentes y hace como máximo una corrección adicional, solo para servicios con campos inválidos y dentro del mismo plazo de 105 segundos. No convierte importes inválidos en cero. Cada escritura debe devolver el ID actualizado antes de anunciar éxito. Las pruebas cubren la recarga de un lote regional/global guardado, reparación selectiva, cachés corruptas y escrituras sin filas afectadas.

Verificación de persistencia (11 de octubre de 2026): tras desplegar la versión 7 de la función, el usuario confirmó que ERP SAP conserva importes y gráfica después de recargar localhost. Una consulta de lectura a Supabase confirmó 9/9 estimaciones guardadas para ERP SAP y 9/9 para Big-Data_Analitycs, asociadas a sus respectivos análisis.

### Flujo de arquitectura y controles del dashboard

La versión 8 de `cloudops-analyze-project` incorpora la acción autenticada `architecture`. Lee los servicios, requisitos y contexto del análisis completado del propietario. Gemini propone conexiones de solicitud, autenticación, datos, permisos, DNS y observabilidad, con explicación, referencias a requisitos y supuestos. Debe incluir todos los servicios del análisis y un actor de entrada, sin servicios inventados, duplicados o aislados. Hay como máximo una corrección de formato dentro del plazo compartido de 105 segundos.

La versión 9 corrige la validación de relaciones: el modelo recibe referencias cortas S1/R1 restringidas mediante enumeraciones del esquema y los vínculos servicio/requisito guardados. El servidor traduce las referencias a UUID originales antes de persistir. Operaciones distintas entre los mismos extremos son válidas; se rechazan relaciones idénticas, autoenlaces, requisitos vacíos y referencias ajenas. La corrección automática recibe el índice/campo inválido y la respuesta anterior. Los diagnósticos del servidor contienen solo mensajes del validador, sin fuentes, respuestas del modelo ni credenciales. El editor admite y separa visualmente conexiones paralelas.

La migración `20261011194448_project_architecture_flow.sql` añade `cloudops_project_analyses.architecture_flow`. Conserva RLS y lectura por propietario; los clientes no tienen permiso UPDATE. Solo la función autenticada guarda el flujo y verifica la fila escrita. Una generación posterior recupera el flujo guardado sin consumir otra llamada al modelo.

En Arquitectura de red, «Generar flujo del proyecto» aplica el diagrama conectado y lo encuadra completo. «Recorrer flujo» resalta cada relación y explica su propósito. Se conservan edición, importación, exportación, deshacer y rehacer. El flujo base queda en Supabase; las ediciones manuales se guardan localmente por proyecto/análisis. Un borrador local tiene prioridad y puede sustituirse por el flujo guardado mediante el mismo botón. La propuesta describe cómo implementar el proyecto; no inspecciona infraestructura AWS desplegada.

«Vaciar dashboard» vacía su vista y presupuesto del escenario actual. «Restaurar datos» recupera indicadores, servicios y costos del análisis. No elimina fuentes ni análisis de Supabase.

Validación: 212 pruebas, compilación y comprobación de tipos del backend correctas; función v9 activa y columna consultable. El 11 de octubre de 2026, el usuario confirmó en localhost que aparecen las conexiones y funciona «Recorrer flujo». Una consulta posterior a Supabase verificó el flujo de ERP SAP guardado con 10 componentes y 24 conexiones. Big-Data_Analitycs aún no tiene un flujo generado. El asesor de seguridad no señaló problemas en la tabla modificada; mantiene avisos ajenos a este cambio sobre tablas internas sin políticas y [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
