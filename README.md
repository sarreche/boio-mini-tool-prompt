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
- Despliegue en Vercel desde `master`.

La base de datos para conversaciones, perfiles, roles, planes, métricas y auditoría
ya está creada en Supabase. La interfaz de chat y la integración de estos datos con
el MVP continúan como trabajo futuro.

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
npm run lint
npm run build
```

Abrir [http://localhost:3000](http://localhost:3000).

No existe actualmente una suite de tests automatizados. Los flujos de login, logout, cambio de contraseña, protección de páginas e inferencia deben verificarse manualmente.

## Flujos

```text
/login
  -> Supabase Auth
  -> cookies de sesión SSR
  -> /prompts

/api/inference
  -> verifica identidad con Supabase
  -> proveedor configurado
  -> fallback de modelos
```

## Documentación

- [Arquitectura](docs/architecture.md)
- [Dominio](docs/domain.md)
- [Despliegue](docs/deployment.md)
- [Guía del repositorio](AGENTS.md)

Producción: [https://minitoolprompt.vercel.app](https://minitoolprompt.vercel.app)
