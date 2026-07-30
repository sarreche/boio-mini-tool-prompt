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

Archivar una conversación establece `archived_at`; no elimina físicamente sus
datos.

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

La configuración actual de la ruta `default` usa únicamente
`openai/gpt-oss-20b:free`, con prioridad `10`. Los demás modelos de OpenRouter y
Hugging Face permanecen catalogados, pero sus reglas están inactivas para evitar
esperas causadas por endpoints que no responden. Pueden reactivarse mediante una
migración o una futura interfaz administrativa sin modificar el código de
inferencia.

`execution_attempts.model_id` conserva la relación con el catálogo, mientras
`provider_code` y `model_code` mantienen un snapshot histórico.

`complete_inference_execution` finaliza atómicamente un intento exitoso, su
ejecución y el evento de consumo. Solo `service_role` puede ejecutarla.

## Auditoría y privacidad

`app_private.audit_logs` está destinado a acciones administrativas. No reemplaza
`auth.audit_log_entries`, que pertenece al sistema de autenticación de Supabase.

`account_deletion_requests` registra el flujo de solicitud de borrado definitivo.
La implementación del proceso que revoca sesiones y elimina datos continúa
pendiente.

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

La futura aplicación administrativa deberá validar los roles en servidor y escribir
un evento de auditoría por cada operación sensible.
