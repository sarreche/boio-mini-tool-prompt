# Despliegue

## Estado confirmado

La aplicación se despliega en Vercel mediante la integración con Git.

| Elemento | Valor |
|---|---|
| Producción | `https://minitoolprompt.vercel.app` |
| Repositorio | `github.com/sarreche/boio-mini-tool-prompt.git` |
| Rama de producción | `master` |
| Deploy | Automático al hacer push a `master` |
| Framework | Next.js |

Una captura del panel confirmó un despliegue:

- Estado `Ready`.
- Ambiente `Production`.
- Marcado como `Current`.
- Commit `b97230c`.
- Duración de build de 1 minuto 14 segundos.
- Fecha 23 de octubre de 2025.

La captura también mostró cuatro recomendaciones de Vercel cuyo contenido está **PENDIENTE DE CONFIRMACIÓN**.

## Ambientes

Vercel proporciona:

- Development local.
- Preview para ramas distintas de producción.
- Production desde `master`.

El uso habitual de previews se considera una buena práctica confirmada, aunque el flujo de trabajo todavía no está formalizado.

## Preparación local

```bash
npm ci
npm run lint
npm run build
```

El build actual utiliza `next/font/google` para Geist y Geist Mono. Necesita acceso a Google Fonts durante la compilación.

## Variables requeridas

### Inferencia

- `OPENROUTER_TOKEN`
- `HUGGINGFACE_TOKEN`
- `DEFAULT_MODEL`

### Autenticación temporal

- `GOOGLE_SHEETS_ID`
- `GOOGLE_SHEETS_RANGE`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

Nunca almacenar valores reales en el repositorio. Configurarlos por ambiente en Vercel.

## Acceso saliente

El runtime necesita alcanzar:

- Google Sheets API.
- OpenRouter si `DEFAULT_MODEL=OR`.
- Hugging Face si `DEFAULT_MODEL=HF`.

El build necesita alcanzar Google Fonts mientras se usen las fuentes actuales.

## Verificación de un preview

1. Abrir el proyecto en Vercel.
2. Entrar en `Deployments`.
3. Identificar el ambiente, rama, commit y estado.
4. Abrir la URL de preview.
5. Revisar build logs.
6. Probar:
   - Redirección inicial.
   - Validación de email.
   - Validación de PIN.
   - Español e inglés.
   - Aplicación de presets.
   - Respuesta de inferencia.
   - Fallback ante fallo de un modelo.
   - Logout.
7. No promover hasta completar la revisión.

## Verificación de producción

1. Confirmar que el despliegue figura como `Ready`, `Production` y `Current`.
2. Confirmar rama `master` y SHA esperado.
3. Probar la URL principal.
4. Revisar logs de funciones.
5. Confirmar variables de Production.
6. Comprobar que no existan secretos expuestos al cliente.

## Configuración en Vercel

Para revisar la rama:

1. Proyecto → `Settings`.
2. `Environments`.
3. `Production`.
4. `Branch Tracking`.
5. Confirmar `master`.

Para revisar Git:

1. Proyecto → `Settings`.
2. `Git`.
3. Confirmar repositorio y despliegues automáticos.

Para revisar recomendaciones:

1. Abrir el deployment actual.
2. Expandir `Deployment Settings`.
3. Revisar cada recomendación antes de aplicarla.
4. Probar cualquier actualización en Preview.

## Rollback

Vercel conserva despliegues anteriores que pueden reasignarse o promoverse. Antes de un cambio de producción:

1. Identificar el último despliegue estable.
2. Registrar su URL y commit.
3. Probar el nuevo build en Preview.
4. Si producción falla, volver al despliegue estable desde Vercel.

El procedimiento operativo exacto y responsables están **PENDIENTES DE CONFIRMACIÓN**.

## Arquitectura futura de despliegue

Se prevén dos aplicaciones:

- Aplicación pública.
- Aplicación administrativa para `admin` y `root`.

La recomendación inicial es utilizar proyectos de Vercel separados conectados al mismo backend, con autorización comprobada en servidor. La decisión de monorepo, repositorios separados o estructura exacta está **PENDIENTE DE CONFIRMACIÓN**.

Al adoptar una base de datos deberán coordinarse:

- Migraciones antes de promover una versión incompatible.
- Variables separadas para Preview y Production.
- Verificación de Row Level Security.
- Auditoría administrativa.
- Procedimiento de rollback de aplicación y datos.

## PENDIENTES DE CONFIRMACIÓN

- Versión mínima oficial de Node.js.
- Contenido de las cuatro recomendaciones actuales de Vercel.
- Estrategia de ramas y previews.
- Responsable y procedimiento formal de rollback.
- Regiones y límites de funciones.
- Estructura de despliegue de la aplicación administrativa.
- Estrategia de migraciones de la futura base de datos.
