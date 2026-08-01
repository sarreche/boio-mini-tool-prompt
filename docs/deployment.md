# Despliegue

## Estado

| Elemento | Valor |
|---|---|
| Producción | `https://minitoolprompt.vercel.app` |
| Repositorio | `github.com/sarreche/boio-mini-tool-prompt.git` |
| Rama de producción | `master` |
| Plataforma | Vercel |
| Autenticación | Supabase Auth |

## Variables requeridas

### Supabase Auth

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

### Inferencia

- `OPENROUTER_TOKEN`
- `HUGGINGFACE_TOKEN`
- `AI_MODEL_ROUTE` (actualmente `default`)

Configurar las variables por ambiente en Vercel. La publishable key puede exponerse
al navegador. `SUPABASE_SECRET_KEY`, `OPENROUTER_TOKEN` y `HUGGINGFACE_TOKEN` son
secretos de servidor y nunca deben usar el prefijo `NEXT_PUBLIC_`.

La secret key de Supabase permite que `/api/inference` consulte la configuración
privada de modelos y persista ejecuciones. Debe configurarse por separado para
Development, Preview y Production según los ambientes que vayan a utilizarse.

Las variables antiguas `GOOGLE_SHEETS_*` y `GOOGLE_SERVICE_ACCOUNT_*` ya no son consumidas por la aplicación y deben retirarse de Vercel después de validar el despliegue.

## Configuración externa

En Supabase:

1. Habilitar Email/Password.
2. Deshabilitar el registro público.
3. Establecer Site URL en `https://minitoolprompt.vercel.app`.
4. Autorizar `http://localhost:3000` y las URLs de preview necesarias.
5. Crear usuarios manualmente con email confirmado.

Sin SMTP ni correos automáticos, el panel genera enlaces manuales de invitación de
un solo uso mediante Supabase Auth. El enlace debe comunicarse por un canal externo,
se muestra una sola vez y nunca se guarda en auditoría. La recuperación de cuentas
continúa siendo un procedimiento manual.

El cierre operativo crea el bucket privado `chat-attachments`, con límite de 1 MB
y tipos TXT/Markdown. Debe permanecer no público en todos los ambientes.

## Verificación de preview

1. Confirmar las variables públicas y secretas de Supabase, los tokens de
   proveedores y `AI_MODEL_ROUTE`.
2. Probar redirección inicial y login válido e inválido.
3. Confirmar que `/prompts` y `/account/password` redirigen sin sesión.
4. Confirmar que `/api/inference` devuelve `401` sin sesión.
5. Probar inferencia, fallback entre proveedores, persistencia de ejecución, cambio
   de contraseña y logout.
   Para el fallback, comprobar al menos `429` con `Retry-After` corto y largo,
   `503`, `402`, respuesta no JSON y éxito del modelo siguiente. Confirmar que la
   respuesta al navegador no contiene detalles del proveedor.
6. Verificar español e inglés.
7. Revisar logs y ejecutar los asesores de seguridad de Supabase.
8. Probar acceso `/admin` con user, admin y root; suspensión inmediata, invitación
   manual y restricciones exclusivas de root.
8. No promover hasta completar la revisión.

## Verificación local

```bash
npm ci
npm run lint
npm run build
```

El build descarga Google Fonts mientras se utilice `next/font/google`; un fallo de red en esa descarga debe informarse separadamente.

## Rollback

Vercel conserva despliegues anteriores. Antes de promover:

1. Identificar el último deployment estable.
2. Probar el cambio en Preview.
3. Ante un fallo, reasignar producción al deployment estable.

La hoja de Google puede conservarse temporalmente como respaldo, pero la aplicación ya no debe tener acceso a ella.
