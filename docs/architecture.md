# Arquitectura

## Alcance

Este documento separa la arquitectura implementada del objetivo futuro. Los componentes futuros no deben interpretarse como disponibles.

## Arquitectura actual

Prompt Toolkit es una aplicación Next.js con páginas, componentes cliente y rutas API dentro del mismo despliegue.

```text
Navegador
  |
  +-- /login --------------------+
  |                              |
  |                    /api/auth/validate-email
  |                    /api/auth/validate-pin
  |                              |
  |                        Google Sheets
  |
  +-- /prompts
         |
         +-- /api/inference
                  |
                  +-- OpenRouter, o
                  +-- Hugging Face
```

### Componentes

| Componente | Responsabilidad |
|---|---|
| `src/middleware.ts` | Redirecciones y protección de páginas según la cookie |
| `src/app/(auth)/login/page.tsx` | Login cliente en dos pasos |
| `src/lib/auth.ts` | Cliente para las rutas de autenticación |
| `src/app/api/auth/validate-email/route.ts` | Verificación de email en Google Sheets |
| `src/app/api/auth/validate-pin/route.ts` | Verificación de PIN y creación de cookie |
| `src/app/api/auth/logout/route.ts` | Eliminación de cookie |
| `src/app/prompts/page.tsx` | Selección inicial de idioma |
| `src/app/prompts/PromptsPage.tsx` | Estado e interacción de la botonera |
| `src/components/PromptButtons.tsx` | Construcción de prompts desde presets |
| `src/lib/i18n.ts` | Textos, presets y system prompts |
| `src/app/api/inference/route.ts` | Llamadas y fallback de modelos |

### Rutas

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/` | Redirige según sesión |
| GET | `/login` | Login |
| GET | `/prompts` | Botonera protegida por middleware |
| POST | `/api/auth/validate-email` | Comprueba email |
| POST | `/api/auth/validate-pin` | Comprueba PIN e inicia sesión |
| POST | `/api/auth/logout` | Cierra sesión |
| POST | `/api/inference` | Ejecuta una consulta de IA |

### Sesión actual

- Cookie: `isAuthenticated`.
- Valor: `true`.
- `httpOnly`: sí.
- `sameSite`: `strict`.
- `secure`: solamente en producción.
- Duración: dos horas.
- El middleware solo comprueba que exista un valor.
- No se almacena identidad ni rol en la sesión.

El matcher excluye las rutas API. En consecuencia, proteger `/prompts` no protege `/api/inference`.

### Inferencia actual

1. El cliente envía `prompt`, `lang` y `systemPrompt`.
2. El servidor valida únicamente que exista `prompt`.
3. `DEFAULT_MODEL` selecciona `OR` o `HF`.
4. Se recorren secuencialmente los modelos de esa familia.
5. La primera respuesta con contenido se devuelve como `{ model, text }`.
6. Si todos fallan, se devuelve HTTP 503.

`lang` no se utiliza en el servidor. El `systemPrompt` enviado por el cliente sí se utiliza.

No hay fallback entre proveedores, streaming, persistencia ni conversación multi-turno.

### Idioma

- Login detecta español o inglés desde el navegador.
- `/prompts` acepta `?lang=es|en`.
- Sin parámetro, `/prompts` usa inglés.
- El selector cambia el idioma en memoria, sin actualizar la URL.
- `<html lang>` permanece en inglés.

## Límites de confianza actuales

- Navegador: entrada no confiable.
- Rutas API: responsables de proteger secretos de proveedores.
- Google Sheets: fuente temporal de autorización.
- OpenRouter/Hugging Face: terceros que reciben prompt y system prompt.
- Vercel: ejecuta la aplicación y almacena variables de entorno.

## Arquitectura futura confirmada

```text
Aplicación pública (Vercel)
  |
  +-- autenticación
  +-- catálogo de tareas
  +-- chat y conversaciones
  +-- historial y exportación
  +-- valoraciones
  |
  +----------------------+
                         |
                  Supabase preferido
                         |
  +----------------------+
  |
Aplicación administrativa (Vercel)
  |
  +-- usuarios y planes
  +-- catálogo y modelos
  +-- métricas y alertas
  +-- auditoría
  +-- acceso root a conversaciones
```

Supabase es la alternativa preferida para Auth, PostgreSQL y posiblemente Storage, pero su adopción todavía no está implementada.

### Datos previstos

- Perfiles.
- Planes y suscripciones.
- Catálogo de tareas y condición gratuita/premium.
- Conversaciones.
- Mensajes.
- Ejecuciones y modelo utilizado.
- Métricas operativas.
- Valoraciones y comentarios.
- Consumo mensual.
- Pruebas premium no renovables.
- Archivos `.txt` y `.md`.
- Auditoría administrativa.
- Preferencia de exclusión del análisis.

### Autorización prevista

- Usuario: únicamente sus datos.
- `admin`: usuarios, planes, consumo, catálogo, modelos, métricas y alertas.
- `root`: todo lo anterior, conversaciones completas, roles, configuración y borrado definitivo.

Toda comprobación debe realizarse en servidor y base de datos, no solo en la interfaz. Las tablas expuestas deberán utilizar Row Level Security y propiedad por usuario.

### Conversación prevista

- Inicio desde tarea o chat vacío.
- El modelo genera preguntas aclaratorias.
- El prompt puede mostrarse/editase como función avanzada.
- Copiar, regenerar y continuar respuestas.
- Regenerar no consume un uso adicional inicialmente.
- El modelo puede cambiar por fallback entre mensajes.
- Si todos los modelos gratuitos fallan, se muestra un error.

Cada mensaje generado debe registrar el modelo real utilizado.

### Ciclo de los datos

- Activo: visible.
- Archivado: oculto, pero conservado.
- Borrado definitivo: elimina la cuenta y sus datos mediante un procedimiento específico.
- Las métricas agregadas y anonimizadas pueden conservarse.
- La conservación general es indefinida, sujeta a mantenimiento futuro.
- Los usuarios premium podrán exportar conversaciones en Markdown.

## PENDIENTES DE CONFIRMACIÓN

- Esquema físico definitivo.
- Decisión final de Supabase.
- Política concreta de mantenimiento y segmentación de datos.
- Implementación del dictado.
- Costos aceptables para almacenamiento de archivos.
- Mecanismo de alertas dentro del dashboard.
- Topología final del repositorio para las dos aplicaciones.
