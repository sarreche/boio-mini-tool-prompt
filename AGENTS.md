# AGENTS.md

## Propósito

Este repositorio contiene Prompt Toolkit, una aplicación web pensada para facilitar tareas cotidianas con modelos de lenguaje a personas con poca experiencia tecnológica.

La implementación actual es un MVP. La documentación distingue siempre entre:

- **Estado actual:** comportamiento verificado en el código.
- **Dirección futura confirmada:** objetivos aprobados que todavía no están implementados.
- **PENDIENTE DE CONFIRMACIÓN:** decisiones que no deben asumirse.

No describir una funcionalidad futura como si ya existiera.

## Stack actual

- Next.js 15 con App Router y Turbopack.
- React 19 y TypeScript.
- Tailwind CSS 4.
- Google Sheets para la validación temporal de usuarios.
- OpenRouter o Hugging Face para inferencia texto a texto.
- Vercel para despliegue.

## Estructura

- `src/app/`: páginas y rutas API.
- `src/app/(auth)/login/`: login del MVP.
- `src/app/prompts/`: interfaz de prompts.
- `src/app/api/auth/`: validación de email/PIN y logout.
- `src/app/api/inference/`: selección y fallback de modelos.
- `src/components/`: componentes reutilizables.
- `src/lib/i18n.ts`: textos, presets y system prompts en español e inglés.
- `src/lib/auth.ts`: llamadas cliente a las rutas de autenticación.
- `src/middleware.ts`: protección y redirecciones de páginas.
- `public/`: imágenes estáticas.
- `docs/`: arquitectura, dominio y despliegue.

## Comandos

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run start
```

En Windows con una política de ejecución restrictiva puede ser necesario usar `npm.cmd`.

No existe actualmente una suite de tests.

## Reglas para cambios

1. No incorporar secretos, tokens, claves privadas ni valores reales de `.env`.
2. Mantener `package-lock.json` sincronizado con `package.json`.
3. Mantener español e inglés sincronizados cuando se modifique `src/lib/i18n.ts`.
4. Tratar como sensibles los cambios de autenticación, cookies, middleware, rutas API, métricas y almacenamiento de conversaciones.
5. No confiar únicamente en controles de interfaz para autorización.
6. Mantener las credenciales privilegiadas exclusivamente en el servidor.
7. Si se incorpora Supabase, habilitar Row Level Security en toda tabla expuesta y restringir cada fila a su propietario cuando corresponda.
8. No usar metadatos editables por el usuario para determinar roles.
9. Conservar el fallback de modelos como parte del requisito de disponibilidad, salvo decisión explícita.
10. Actualizar la documentación cuando cambien flujos, variables de entorno, modelos, proveedores o despliegue.
11. No cambiar la estructura esperada de Google Sheets mientras siga activa sin documentar y coordinar la transición.
12. No llamar “eliminar” a una operación que solamente archive u oculte datos.

## Verificación mínima

Antes de entregar cambios:

1. Ejecutar `npm run lint`.
2. Ejecutar `npm run build`.
3. Informar por separado fallos causados por restricciones del entorno, como la descarga de Google Fonts.
4. Verificar manualmente los flujos afectados.
5. Confirmar que no se agregaron secretos al diff.
6. Si hay cambios de datos, verificar permisos, aislamiento por usuario y auditoría.

## Producto: dirección futura confirmada

- Evolucionar la caja de texto del MVP hacia una experiencia de chat.
- Permitir iniciar desde una tarea o desde un chat vacío.
- Usar aclaraciones generadas por el modelo para completar cada tarea.
- Mantener el prompt visible/editable como opción avanzada.
- Persistir conversaciones, mensajes, modelo utilizado, resultados y valoraciones.
- Incorporar planes gratuito y pago con límites y tareas premium.
- Mantener inicialmente Gumroad y la activación manual de suscripciones.
- Migrar autenticación y datos desde Google Sheets, probablemente a Supabase.
- Incorporar una aplicación administrativa separada para roles `root` y `admin`.

Ver `docs/domain.md` y `docs/architecture.md` antes de diseñar funcionalidades nuevas.

## Git y GitHub

### Identidad

- Todas las acciones de GitHub de este repositorio deben realizarse con la cuenta `sarreche`.
- La identidad esperada para los commits es `Santiago Arreche <sarreche@gmail.com>`.
- Antes de crear un commit o hacer push, verificar `git config user.name`, `git config user.email` y la cuenta autenticada en GitHub.
- El email del commit debe estar asociado a la cuenta GitHub `sarreche` para que GitHub atribuya correctamente la autoría.
- Si la identidad no coincide, detener la publicación y solicitar confirmación.
- Si fuera necesario ajustar la identidad, hacerlo en la configuración local del repositorio. No modificar automáticamente la configuración global de Git.
- No añadir coautores ni atribuir commits a agentes o cuentas diferentes, salvo solicitud explícita.

### Ramas

No trabajar directamente sobre `master`. Crear una rama descriptiva usando una de estas categorías:

| Prefijo | Uso |
|---|---|
| `feature/` | Funcionalidad nueva |
| `change/` | Cambio de comportamiento, refactor o ajuste que no es una funcionalidad nueva ni un fix |
| `docs/` | Documentación |
| `fix/` | Corrección de un defecto |

Usar nombres en minúsculas, con palabras separadas por guiones y sin identificadores genéricos.

Ejemplos:

- `feature/conversation-history`
- `change/prompt-selection-flow`
- `docs/repository-documentation`
- `fix/inference-authentication`

### Commits y pull requests

- Usar mensajes de commit breves con el mismo tipo conceptual: `feat:`, `change:`, `docs:` o `fix:`.
- Incluir en cada commit solamente cambios relacionados.
- Hacer push únicamente a una rama de trabajo, nunca directamente a `master`.
- Crear un pull request hacia `master`.
- El pull request debe explicar qué cambió, por qué, su impacto y las verificaciones realizadas.
- Crear el pull request como draft salvo que se solicite expresamente que quede listo para revisión.

## PENDIENTES DE CONFIRMACIÓN

- Proveedor definitivo de base de datos y autenticación; Supabase es la opción preferida, no una implementación existente.
- Cantidades concretas de usos mensuales y pruebas premium.
- Categorías definitivas del catálogo de tareas.
- Política concreta de retención/mantenimiento para datos conservados indefinidamente.
- Proveedores futuros para dictado y otros tipos de archivo.
- Proceso técnico de sincronización o reemplazo de Gumroad.
- Estrategia final de ambientes y ramas adicionales a producción/preview.
