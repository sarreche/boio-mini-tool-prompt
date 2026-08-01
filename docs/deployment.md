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

Sin SMTP ni correos automáticos, la recuperación consiste en que el administrador asigne y comunique una contraseña temporal nueva.

## Verificación de preview

1. Confirmar las variables públicas y secretas de Supabase, los tokens de
   proveedores y `AI_MODEL_ROUTE`.
2. Probar redirección inicial y login válido e inválido.
3. Confirmar que `/prompts` y `/account/password` redirigen sin sesión.
4. Confirmar que `/api/inference` devuelve `401` sin sesión.
5. Aplicar todas las migraciones, incluida `product_frontend_integration`.
6. Probar catálogo bilingüe, chat multi-turno, historial, archivo, valoraciones,
   perfil, privacidad y solicitud de borrado.
7. Probar inferencia, fallback, idempotencia, persistencia de mensajes/ejecución/uso,
   cambio de contraseña y logout.
8. Verificar español e inglés.
9. Revisar logs y ejecutar los asesores de seguridad y rendimiento de Supabase.
10. No promover hasta completar la revisión.

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
