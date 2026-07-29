# Arquitectura

## Arquitectura actual

Prompt Toolkit es una aplicación Next.js desplegada en Vercel.

```text
Navegador
  |
  +-- /login ---------- Supabase Auth
  |
  +-- /prompts
         |
         +-- /account/password
         |
         +-- /api/inference
                  |
                  +-- OpenRouter, o
                  +-- Hugging Face
```

## Autenticación

- Supabase Auth con email y contraseña.
- Las cuentas se crean manualmente; no hay registro público.
- `@supabase/ssr` mantiene la sesión en cookies.
- El middleware renueva la sesión y valida la identidad con `getClaims()`.
- `/prompts` y `/account/*` requieren sesión válida.
- `/api/inference` repite la validación en el servidor y devuelve `401` sin identidad.
- El logout revoca la sesión en Supabase.
- La cookie heredada `isAuthenticated` se elimina y ya no concede acceso.
- No se usa `getSession()` para decisiones de autorización.

No existen todavía tablas de perfiles, roles o planes. Tampoco se utiliza una clave privilegiada en la aplicación.

## Componentes principales

| Componente | Responsabilidad |
|---|---|
| `src/middleware.ts` | Protección y redirecciones |
| `src/lib/supabase/*` | Clientes de navegador, servidor y middleware |
| `src/app/(auth)/login/page.tsx` | Login email/contraseña |
| `src/app/account/password/page.tsx` | Cambio voluntario de contraseña |
| `src/app/api/inference/route.ts` | Autorización, inferencia y fallback |
| `src/lib/i18n.ts` | Textos bilingües y presets |

## Inferencia

1. La ruta verifica una identidad Supabase firmada.
2. El cliente envía `prompt`, `lang` y `systemPrompt`.
3. El servidor valida que exista `prompt`.
4. `DEFAULT_MODEL` selecciona OpenRouter (`OR`) o Hugging Face (`HF`).
5. Se recorren los modelos de esa familia hasta obtener una respuesta.
6. Si todos fallan, se devuelve HTTP 503.

No hay fallback entre proveedores, streaming, persistencia ni conversación multi-turno.

## Límites de confianza

- El navegador y sus entradas no son confiables.
- La publishable key de Supabase es pública por diseño.
- Nunca se expone `service_role` ni una secret key.
- Las rutas API protegen los secretos de inferencia.
- Las futuras tablas expuestas deberán habilitar RLS y aislar cada fila por propietario.

## Dirección futura confirmada

Se mantienen como objetivos el chat, conversaciones persistentes, métricas, planes, roles y una aplicación administrativa separada. No están implementados actualmente.
