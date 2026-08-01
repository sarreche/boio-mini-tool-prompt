# Prompt Toolkit

Prompt Toolkit es una aplicación web bilingüe que facilita tareas cotidianas con modelos de lenguaje a personas con poca experiencia tecnológica. El MVP ofrece prompts prediseñados y una interfaz texto a texto.

## Estado actual

- Autenticación con email y contraseña mediante Supabase Auth.
- Altas manuales, sin registro público ni recuperación automática.
- Sesiones SSR verificadas en páginas protegidas y en `/api/inference`.
- Cambio voluntario de contraseña desde la aplicación.
- Interfaz en español e inglés.
- Inferencia mediante OpenRouter y Hugging Face con catálogo y fallback dinámico
  configurados en Supabase.
- Chat multi-turno con historial, valoraciones y catálogo bilingüe persistidos.
- Planes Free/Paid, cuotas configurables, tareas premium y pruebas manuales.
- Adjuntos privados TXT/MD y exportación Markdown para Paid o excepciones.
- Panel `/admin` integrado para dashboard y operaciones de `admin` y `root`.
- Despliegue en Vercel desde `master`.

La persistencia de producto, autorización, consumo, métricas, auditoría y borrado
definitivo está conectada a Supabase. Las cantidades comerciales permanecen
configurables y sin valores predeterminados.

## Stack

- Next.js 15 y React 19
- TypeScript y Tailwind CSS 4
- Supabase Auth con `@supabase/ssr`
- OpenRouter o Hugging Face
- Vercel

## Instalación

```bash
git clone https://github.com/sarreche/boio-mini-tool-prompt.git
cd boio-mini-tool-prompt
npm ci
```

Crear `.env.local` a partir de `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

OPENROUTER_TOKEN=
HUGGINGFACE_TOKEN=
AI_MODEL_ROUTE=default
```

La publishable key puede usarse en el navegador. La secret key de Supabase y los
tokens de inferencia son exclusivamente de servidor y nunca deben configurarse en
variables `NEXT_PUBLIC_*`.

## Configuración de Supabase

1. Habilitar Email/Password en Authentication.
2. Deshabilitar el registro público.
3. Configurar Site URL y redirect URLs para producción, previews y `http://localhost:3000`.
4. Crear cada usuario manualmente con email confirmado y una contraseña temporal robusta.
5. Comunicar la contraseña por un canal privado y recomendar su cambio desde la aplicación. La configuración actual exige al menos 8 caracteres, con letras y números.

Sin correo automático, un administrador debe asignar una nueva contraseña temporal cuando un usuario la olvida.

## Desarrollo y verificación

```bash
npm run dev
npm test
npm run lint
npm run build
```

Abrir [http://localhost:3000](http://localhost:3000).

Existe una suite inicial para clasificación, reintentos y saneamiento de errores de
proveedores. Los flujos de autenticación, administración, adjuntos, exportación y
borrado también requieren verificación manual.

## Flujos

```text
/login
  -> Supabase Auth
  -> cookies de sesión SSR
  -> /prompts

/api/inference
  -> verifica identidad con Supabase
  -> reserva cuota o prueba premium
  -> persiste conversación y ejecución
  -> fallback de modelos

/admin/*
  -> rol resuelto en servidor
  -> dashboard y operaciones auditadas
```

## Documentación

- [Arquitectura](docs/architecture.md)
- [Dominio](docs/domain.md)
- [Despliegue](docs/deployment.md)
- [Guía del repositorio](AGENTS.md)

Producción: [https://minitoolprompt.vercel.app](https://minitoolprompt.vercel.app)
