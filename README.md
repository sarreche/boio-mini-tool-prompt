# Prompt Toolkit

Prompt Toolkit es una aplicación web bilingüe que facilita tareas cotidianas con modelos de lenguaje a personas con poca experiencia tecnológica. Su MVP ofrece prompts prediseñados y una interfaz texto a texto.

El producto se encuentra en evolución: la dirección confirmada es convertir la botonera actual en una experiencia de chat con tareas guiadas, historial, métricas de utilidad y planes gratuito/pago.

## Estado del producto

### Implementado actualmente

- Login en dos pasos mediante email y PIN.
- Validación temporal de usuarios contra Google Sheets.
- Sesión mediante una cookie con duración de dos horas.
- Interfaz en español e inglés.
- Doce presets de prompts por idioma.
- Inferencia texto a texto mediante OpenRouter o Hugging Face.
- Fallback secuencial entre modelos gratuitos del proveedor seleccionado.
- Despliegue automático en Vercel desde la rama `master`.

### Dirección futura confirmada

- Interfaz principal tipo chat.
- Inicio desde una tarea prediseñada o un chat vacío.
- Preguntas aclaratorias adaptadas a la tarea.
- Edición avanzada del prompt construido.
- Conversaciones e historial persistentes.
- Valoración útil/no útil y comentario opcional.
- Métricas de uso y registro del modelo utilizado.
- Plan gratuito y plan pago.
- Tareas premium y límites mensuales.
- Autenticación con email/contraseña y Google posteriormente.
- Migración desde Google Sheets a una base de datos, probablemente Supabase.
- Aplicación administrativa separada.

La dirección futura no representa funcionalidad disponible actualmente.

## Stack

- Next.js 15.5.4
- React 19
- TypeScript
- Tailwind CSS 4
- Google APIs
- OpenRouter
- Hugging Face
- Vercel

## Requisitos

- Node.js y npm. La versión mínima oficial está **PENDIENTE DE CONFIRMACIÓN**.
- Una cuenta de servicio de Google con permiso de lectura sobre la hoja configurada.
- Al menos un token válido de OpenRouter o Hugging Face.

## Instalación

```bash
git clone https://github.com/sarreche/boio-mini-tool-prompt.git
cd boio-mini-tool-prompt
npm ci
```

## Variables de entorno

Crear `.env.local` sin versionarlo:

```dotenv
OPENROUTER_TOKEN=
HUGGINGFACE_TOKEN=
DEFAULT_MODEL=OR

GOOGLE_SHEETS_ID=
GOOGLE_SHEETS_RANGE=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

`DEFAULT_MODEL` admite en el código actual:

- `OR`: utiliza OpenRouter.
- `HF`: utiliza Hugging Face.

Solo se intenta el proveedor seleccionado. El fallback actual ocurre entre sus modelos, no entre proveedores.

`IS_DEVELOPMENT` aparece en el entorno local inspeccionado, pero no es consumida por el código.

## Google Sheets

La autenticación del MVP presupone:

- Email en la segunda columna de cada fila (`row[1]`).
- PIN en la tercera columna (`row[2]`).
- Acceso de solo lectura para la cuenta de servicio.

La estructura completa de la hoja y sus encabezados están **PENDIENTES DE CONFIRMACIÓN**. Esta integración es temporal y será reemplazada.

## Desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

En PowerShell con ejecución de scripts deshabilitada:

```powershell
npm.cmd run dev
```

## Comandos

| Comando | Función |
|---|---|
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run lint` | ESLint |
| `npm run build` | Build de producción con Turbopack |
| `npm run start` | Sirve el build de producción |

No existe actualmente un comando de tests.

## Flujos principales

### Login

```text
/login
  -> valida email en Google Sheets
  -> solicita PIN
  -> valida email + PIN
  -> crea cookie isAuthenticated
  -> redirige a /prompts
```

### Inferencia

```text
texto del usuario
  -> preset opcional
  -> /api/inference
  -> proveedor configurado
  -> modelos gratuitos en orden
  -> primera respuesta exitosa
```

Consultar [docs/architecture.md](docs/architecture.md) para el detalle técnico.

## Seguridad y limitaciones actuales

- La autenticación mediante Google Sheets y cookie booleana pertenece al MVP.
- El middleware protege páginas, pero no intercepta `/api/*`.
- `/api/inference` no valida actualmente una sesión.
- El cliente puede enviar el `systemPrompt`.
- No hay rate limiting, historial, roles ni auditoría.
- No hay validación formal de los cuerpos JSON.
- No hay tests automatizados ni CI versionada.
- El build necesita acceso a Google Fonts para descargar Geist.

Estos puntos describen el sistema actual; no representan necesariamente la arquitectura objetivo.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Dominio y producto](docs/domain.md)
- [Despliegue](docs/deployment.md)
- [Guía para agentes y mantenedores](AGENTS.md)

## Despliegue

Producción está alojada en Vercel:

- URL: [https://minitoolprompt.vercel.app](https://minitoolprompt.vercel.app)
- Rama de producción: `master`
- Deploy automático al hacer push a `master`

Ver [docs/deployment.md](docs/deployment.md).

## PENDIENTES DE CONFIRMACIÓN

- Versión mínima de Node.js.
- Estructura formal completa de Google Sheets mientras continúe activa.
- Cantidades exactas de usos del plan gratuito y pruebas premium.
- Política operativa de mantenimiento de datos retenidos.
- Momento y alcance definitivo de la migración a Supabase.
