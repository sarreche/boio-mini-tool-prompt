# Base de datos de producto

## Estado actual

Supabase Postgres contiene la base de persistencia y autorización del producto. Las
migraciones versionadas viven en `supabase/migrations/` y se aplican de forma
incremental.

La base distingue dos esquemas:

- `public`: datos que la aplicación puede consultar bajo Row Level Security (RLS).
- `app_private`: roles, auditoría, eventos administrativos y configuración operativa
  accesibles exclusivamente desde procesos de servidor privilegiados.

## Usuarios y roles

`public.profiles` extiende a `auth.users` mediante su clave primaria. Un trigger crea
el perfil y el rol `user` para cada nueva cuenta.

Los roles `user`, `admin` y `root` se almacenan en
`app_private.user_roles`. No se utilizan metadatos editables del usuario para tomar
decisiones de autorización.

El usuario `sarreche+root@gmail.com` es el `root` inicial.

`app_private.user_access_controls` aplica suspensiones inmediatas sin depender de
claims desactualizados. `app_private.operational_settings` guarda umbrales globales
y `anonymous_daily_metrics` conserva exclusivamente agregados sin identificador
durante un borrado definitivo.

## Planes y suscripciones

- `plans` define los planes `free` y `paid`.
- `plan_entitlements` almacena capacidades configurables. Los límites mensuales y
  las cantidades de pruebas premium continúan pendientes de confirmación.
- `subscriptions` representa el estado actual de una suscripción manual o de
  Gumroad.
- `app_private.subscription_events` conserva su historial.
- `user_entitlements` permite excepciones temporales por usuario.

Los estados de suscripción son `pending`, `active`, `past_due`, `cancelled` y
`expired`.

## Solicitudes de acceso y consultas

`access_requests` registra solicitudes públicas de acceso Free y consultas de
soporte. No representa una compra ni activa una cuenta o suscripción. Cada
solicitud comienza en `pending` y puede pasar a `in_review`, `approved`,
`rejected` o `closed` durante su procesamiento manual.

La tabla tiene RLS habilitado y no concede permisos a `anon` ni `authenticated`.
La escritura se realiza mediante una acción de servidor con `service_role`.
El futuro panel administrativo deberá registrar en auditoría cada cambio de estado.

## Conversaciones y tareas

El esquema incluye:

- `tasks` y `task_translations`.
- `conversations`, `messages` y `attachments`.
- `ratings`.
- `premium_trial_grants` y `premium_trial_usages`.

`task_categories`, `task_category_translations` y los prompts localizados de
`task_translations` convierten el catálogo en configuración operativa. Todas las
tablas públicas nuevas tienen RLS y grants explícitos.

Archivar una conversación establece `archived_at`; no elimina físicamente sus
datos.

`task_categories` y `task_category_translations` organizan el catálogo. Las
traducciones de tarea contienen la plantilla de usuario, el system prompt y su
versión publicada. Las doce tareas y tres categorías sembradas son un catálogo
inicial editable, no el catálogo definitivo.

`begin_chat_execution`, `complete_chat_execution` y `fail_chat_execution` coordinan
atómicamente conversaciones, mensajes, ejecuciones y eventos de uso. Solo
`service_role` puede invocarlas. `executions.client_request_id` evita duplicar un
mismo envío del usuario.

## Inferencia y uso

`executions` representa una solicitud lógica. `execution_attempts` registra cada
intento del fallback, incluyendo proveedor, modelo, tokens, latencia y error.

`usage_events` es el registro inmutable para contabilización. Una regeneración
puede conservarse con `billable = false`.

Cuando un usuario excluye su contenido del análisis, las métricas operativas pueden
conservar proveedor, modelo, tokens, latencia, tarea y resultado técnico, pero no
deben copiar texto de mensajes o respuestas a tablas analíticas.

### Proveedores y modelos

- `app_private.ai_providers` almacena el endpoint y el nombre de la variable de
  entorno del token. Nunca almacena el token.
- `app_private.ai_models` contiene los identificadores aceptados por cada proveedor.
- `app_private.model_routing_rules` ordena los modelos dentro de una ruta.
- `public.active_model_routes` expone la configuración activa solamente a
  `service_role`.

La ruta `default` conserva `openai/gpt-oss-20b:free` como preferido y utiliza como
alternativas gratuitas, en este orden, `openai/gpt-oss-120b:free` y
`openrouter/free`. Esta última ruta delega en OpenRouter la selección de un modelo
gratuito disponible. Los modelos de Hugging Face permanecen catalogados pero
inactivos: sus créditos gratuitos son limitados y no se habilitan como fallback
de producción sin confirmar antes la política de costos.

`execution_attempts.model_id` conserva la relación con el catálogo, mientras
`provider_code` y `model_code` mantienen un snapshot histórico. Los intentos
fallidos guardan un código normalizado, estado HTTP cuando existe, `Retry-After` y
un mensaje acotado y saneado. No se persiste el cuerpo arbitrario del proveedor ni
se devuelven estos detalles al cliente.

`complete_inference_execution` finaliza atómicamente un intento exitoso, su
ejecución y el evento de consumo. Solo `service_role` puede ejecutarla.

El chat utiliza `complete_chat_execution`; la función anterior se conserva
temporalmente para compatibilidad con despliegues previos.

## Auditoría y privacidad

`app_private.audit_logs` está destinado a acciones administrativas. No reemplaza
`auth.audit_log_entries`, que pertenece al sistema de autenticación de Supabase.

Las funciones administrativas públicas están revocadas para `PUBLIC`, `anon` y
`authenticated`, concedidas únicamente a `service_role`, validan el actor contra
`app_private.user_roles` y registran los cambios saneados. Admin consulta solamente
sus eventos; root consulta el conjunto.

`account_deletion_requests` registra el flujo de solicitud de borrado definitivo.
La implementación del proceso que revoca sesiones y elimina datos continúa
pendiente.

## Cierre operativo

`app_private.usage_reservations` serializa la autorización de cuota y trials por
usuario. La reserva se consume con una respuesta exitosa o se libera al fallar.
`subscription_events` recibe el historial saneado de cada alta o modificación.

Los adjuntos viven en el bucket privado `chat-attachments`, limitado a TXT/MD UTF-8
de 1 MB. `attachments` conserva metadatos y relaciones. El borrado definitivo
revoca sesiones, usa una operación idempotente, consolida métricas anónimas y
limpia Auth, datos en cascada y objetos de Storage.

## Seguridad

- Todas las tablas de `public` tienen RLS.
- `anon` no tiene permisos sobre las tablas de producto.
- Los usuarios autenticados solo ven sus filas mediante `auth.uid()`.
- No hay políticas `DELETE` para conversaciones ni mensajes.
- Roles, suscripciones, consumo, ejecución y auditoría solo se escriben desde
  procesos de servidor.
- Las relaciones compuestas impiden asociar datos de usuarios diferentes aun si un
  proceso privilegiado comete un error.
- Los secretos de proveedores no se almacenan en Postgres.

La interfaz administrativa integrada valida los roles en servidor y escribe un
evento de auditoría por cada operación sensible. Los enlaces de invitación,
contraseñas, tokens, secretos y contenido de conversaciones no se copian al log.
