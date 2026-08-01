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
- Supabase Auth para autenticación con email y contraseña.
- OpenRouter o Hugging Face para inferencia texto a texto.
- Vercel para despliegue.

## Estructura

- `src/app/`: páginas y rutas API.
- `src/app/(auth)/login/`: login del MVP.
- `src/app/prompts/`: interfaz de prompts.
- `src/lib/supabase/`: clientes SSR de autenticación.
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
11. No reintroducir Google Sheets como fuente de autenticación.
12. No llamar “eliminar” a una operación que solamente archive u oculte datos.

## Preservación de producto y prevención de regresiones

La interfaz y los comportamientos existentes forman parte del contrato del producto. Una integración técnica, migración de datos, refactor o cambio de arquitectura no autoriza por sí mismo a rediseñar la experiencia.

### Separación de alcance

Antes de implementar un cambio relevante, distinguir explícitamente:

- **Cambios internos:** base de datos, APIs, tipos, servicios, persistencia y refactors sin impacto visible.
- **Cambios funcionales visibles:** nuevas acciones o estados necesarios para cumplir el pedido.
- **Cambios de diseño:** layout, navegación, jerarquía, estilos, textos, densidad y responsive.

Si el pedido solamente autoriza cambios internos, preservar la interfaz y los comportamientos visibles. Todo cambio de diseño no indispensable queda fuera de alcance hasta recibir aprobación explícita.

### Inventario previo obligatorio

Antes de reemplazar o modificar sustancialmente una pantalla o componente existente, revisar su implementación actual y registrar los comportamientos que deben conservarse. Según corresponda, comprobar:

- Orden y distribución de secciones.
- Navegación, enlaces y acciones disponibles.
- Estados vacío, carga, éxito, error y deshabilitado.
- Edición, copia, regeneración, selección de tareas y cancelación.
- Menús, diálogos y affordances de interacción.
- Comportamiento responsive y navegación por teclado.
- Textos y paridad entre español e inglés.
- Renderizado de Markdown y otros formatos de contenido.

No asumir que un componente nuevo puede sustituir al anterior sólo porque cubre su flujo principal. Las capacidades secundarias también deben preservarse o declararse expresamente fuera de alcance.

### Umbral de consulta

Detener la implementación y consultar antes de:

- Reordenar o retirar secciones de una pantalla.
- Eliminar, sustituir u ocultar una acción existente.
- Cambiar la navegación o el modelo mental de un flujo.
- Modificar textos importantes o el significado de una operación.
- Simplificar un componente eliminando estados o controles.
- Alterar de manera apreciable el responsive, la densidad o la jerarquía visual.
- Introducir un cambio visible que no sea imprescindible para el objetivo solicitado.

Si una limitación técnica impide preservar un comportamiento, explicar la limitación, las alternativas y el impacto antes de elegir una solución.

### Implementación incremental

- Dividir cambios amplios por capas: esquema y seguridad, acceso a datos, API, conexión de UI y mejoras visibles.
- Mantener cada entrega lo bastante pequeña como para revisar sus regresiones de manera aislada.
- No aprovechar una integración para realizar limpiezas, rediseños o refactors adyacentes que no sean necesarios.
- Considerar preservado todo comportamiento existente que el alcance no reemplace explícitamente.
- Un cambio está incompleto si desaparece o se degrada una capacidad preexistente no aprobada para reemplazo.

### Verificación visual y de comportamiento

Cuando se modifique una interfaz existente:

1. Comparar la implementación anterior y la nueva en los mismos estados y tamaños de pantalla.
2. Revisar como mínimo inicio, carga, éxito, error, menús abiertos y controles deshabilitados cuando existan.
3. Verificar que todas las acciones anteriores siguen presentes y funcionan.
4. Comprobar hover, foco visible, cursor, etiquetas accesibles y navegación por teclado.
5. Usar capturas antes/después cuando el cambio afecte layout o componentes principales.
6. Informar con claridad cualquier verificación visual que no haya podido realizarse; un `build` exitoso no sustituye esta comprobación.

## Verificación mínima

Antes de entregar cambios:

1. Ejecutar `npm run lint`.
2. Ejecutar `npm run build`.
3. Informar por separado fallos causados por restricciones del entorno, como la descarga de Google Fonts.
4. Verificar manualmente los flujos afectados.
5. Confirmar que no se agregaron secretos al diff.
6. Si hay cambios de datos, verificar permisos, aislamiento por usuario y auditoría.
7. Si hay cambios de UI, ejecutar el inventario de regresión y comparar los estados afectados con la versión anterior.
8. Confirmar que el diff no contiene cambios visibles o funcionales ajenos al alcance aprobado.

## Producto: dirección futura confirmada

- Evolucionar la caja de texto del MVP hacia una experiencia de chat.
- Permitir iniciar desde una tarea o desde un chat vacío.
- Usar aclaraciones generadas por el modelo para completar cada tarea.
- Mantener el prompt visible/editable como opción avanzada.
- Persistir conversaciones, mensajes, modelo utilizado, resultados y valoraciones.
- Incorporar planes gratuito y pago con límites y tareas premium.
- Mantener inicialmente Gumroad y la activación manual de suscripciones.
- Ampliar Supabase desde Auth hacia persistencia de conversaciones y datos de producto.
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

- Alcance definitivo de Supabase para datos de producto adicionales a la autenticación ya implementada.
- Cantidades concretas de usos mensuales y pruebas premium.
- Categorías definitivas del catálogo de tareas.
- Política concreta de retención/mantenimiento para datos conservados indefinidamente.
- Proveedores futuros para dictado y otros tipos de archivo.
- Proceso técnico de sincronización o reemplazo de Gumroad.
- Estrategia final de ambientes y ramas adicionales a producción/preview.
