# Arquitectura

## Arquitectura actual

Prompt Toolkit es una aplicación Next.js desplegada en Vercel.

```text
Navegador
  |
  +-- /login ---------- Supabase Auth
  |
  +-- /contact -------- acción de servidor -------- Supabase Postgres
  |
  +-- /prompts
         |
         +-- /account/password
         |
         +-- /plans (vista informativa, sin checkout)
         |
         +-- /api/inference
                  |
                  +-- OpenRouter, o
                  +-- Hugging Face
```

## Autenticación

- Supabase Auth con email y contraseña.
- Las cuentas se crean manualmente; no hay registro público.
- `/contact` permite solicitar acceso Free o enviar una consulta. El envío no crea
  una cuenta: registra una solicitud pendiente para revisión manual.
- `@supabase/ssr` mantiene la sesión en cookies.
- El middleware renueva la sesión y valida la identidad con `getClaims()`.
- `/prompts` y `/account/*` requieren sesión válida.
- `/api/inference` repite la validación en el servidor y devuelve `401` sin identidad.
- El logout revoca la sesión en Supabase.
- La cookie heredada `isAuthenticated` se elimina y ya no concede acceso.
- No se usa `getSession()` para decisiones de autorización.

Supabase Postgres contiene ahora las tablas base para perfiles, roles, planes,
suscripciones, conversaciones, uso y auditoría. La interfaz actual todavía no
consume la mayoría de estas tablas. La acción de `/contact` usa una clave
privilegiada exclusivamente en el servidor para registrar solicitudes.

Ver `docs/database.md` para el modelo implementado y sus límites de acceso.

## Componentes principales

| Componente | Responsabilidad |
|---|---|
| `src/middleware.ts` | Protección y redirecciones |
| `src/lib/supabase/*` | Clientes de navegador, servidor y middleware |
| `src/app/(auth)/login/page.tsx` | Login email/contraseña |
| `src/app/contact/*` | Formulario público y acción de servidor para solicitudes |
| `src/app/account/password/page.tsx` | Cambio voluntario de contraseña |
| `src/app/api/inference/route.ts` | Autorización, inferencia y fallback |
| `src/lib/i18n.ts` | Textos bilingües y presets |

## Inferencia

1. La ruta verifica una identidad Supabase firmada.
2. El cliente envía `prompt`, `lang` y `systemPrompt`.
3. El servidor valida que exista `prompt`.
4. Un cliente Supabase exclusivamente de servidor consulta la ruta configurada en
   `active_model_routes`.
5. Se crea una ejecución pendiente y un intento por cada modelo utilizado.
6. Los modelos se recorren por prioridad, incluso entre proveedores diferentes.
   Los errores `402`, `429`, `503`, otros errores HTTP, respuestas inválidas y
   fallos de red se clasifican y registran antes de continuar con el siguiente
   modelo.
7. Un `429` o `503` solo se reintenta una vez en el mismo modelo cuando el
   proveedor envía `Retry-After` y la espera indicada no supera dos segundos. Una
   espera mayor omite el reintento y activa inmediatamente el fallback.
8. Una respuesta exitosa completa transaccionalmente el intento, la ejecución y el
   evento de uso.
9. Si todos fallan, se persisten los intentos y se devuelve HTTP 503 con un código
   estable y un mensaje accionable. Los detalles técnicos quedan solamente en el
   servidor y la base de datos.

No hay streaming ni conversación multi-turno. La persistencia actual registra
ejecuciones, intentos y uso, pero todavía no crea conversaciones o mensajes desde
esta ruta.

## Límites de confianza

- El navegador y sus entradas no son confiables.
- La publishable key de Supabase es pública por diseño.
- Nunca se expone `service_role` ni una secret key.
- Las rutas API protegen los secretos de inferencia.
- Las futuras tablas expuestas deberán habilitar RLS y aislar cada fila por propietario.

## Persistencia de producto

- Las migraciones viven en `supabase/migrations/`.
- Las tablas expuestas están en `public` y tienen RLS.
- Los datos administrativos y operativos sensibles están en `app_private`.
- El usuario puede consultar solamente sus propios datos.
- Las escrituras sensibles requerirán rutas de servidor.
- Los límites comerciales continúan configurables y sin cantidades definitivas.
- Los proveedores, modelos y prioridades de fallback se configuran en la base de
  datos.

## Dirección futura confirmada

El esquema de persistencia para chat, conversaciones, métricas, planes y roles ya
está creado. Continúan pendientes las interfaces que usan estos datos, la aplicación
administrativa separada y la integración del flujo de inferencia con la nueva
persistencia.
