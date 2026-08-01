# Dominio y producto

## Propósito

Prompt Toolkit nació cuando construir buenos prompts era una barrera importante para utilizar modelos de lenguaje. Su objetivo es facilitar tareas cotidianas a personas, adultas o no, con poca experiencia tecnológica.

El valor del producto no es enseñar sintaxis de prompts, sino reducir el esfuerzo necesario para obtener un resultado útil.

## Estado actual del producto

La aplicación presenta un chat persistente que puede comenzar desde entrada libre o
desde una tarea del catálogo bilingüe. El usuario puede continuar, editar, regenerar,
valorar y archivar conversaciones.

La vista `/plans` compara `free` y `paid`, enlaza a Gumroad y explica la activación
manual. La inferencia aplica capacidades y límites cuando un administrador los
configura; sin cantidad configurada, los usos mensuales son ilimitados.

Desde el login se puede abrir un formulario público para solicitar acceso Free o
enviar una consulta. El formulario registra una solicitud pendiente para revisión
manual; no crea usuarios ni activa planes automáticamente.

Las tareas actuales incluyen explicación, resumen, traducción, mejora de redacción, correo, ideas, speech, cuentos, checklist, cocina, respuesta de WhatsApp y guía rápida.

No todos los presets están confirmados como parte del catálogo futuro.

## Dirección de producto confirmada

Chat, entrada libre, tareas, persistencia, catálogo por categorías, métricas y
planes ya forman parte del estado actual. Permanecen como dirección futura las
preguntas aclaratorias automáticas y el prompt avanzado visible/editable.

## Glosario

### Usuario

Persona con una cuenta individual autenticada mediante email y contraseña en Supabase Auth. Las cuentas se crean manualmente; Google OAuth permanece como dirección futura.

### Tarea

Punto de entrada guiado para resolver una necesidad, por ejemplo redactar un correo o resumir un texto.

### Tarea premium

Tarea sujeta al plan pago. Los usuarios gratuitos podrán probar determinadas tareas premium una cantidad limitada de veces, sin renovación.

### Prompt

Instrucción enviada al modelo. En la experiencia futura será principalmente un detalle avanzado.

### Conversación

Secuencia persistente de mensajes entre un usuario y uno o más modelos. Puede comenzar desde una tarea o desde un chat vacío.

### Mensaje

Entrada de usuario, instrucción de sistema o respuesta de modelo asociada a una conversación.

### Ejecución

Intento de obtener una respuesta. Registra proveedor, modelo, resultado y datos operativos.

### Fallback

Intento secuencial con modelos gratuitos en orden de preferencia para evitar quedar sin respuesta. Si todos fallan, se informa un error.

### Valoración

Indicación de si una respuesta sirvió. Puede incluir un comentario opcional.

### Uso

Unidad que se contabiliza contra un límite. Los límites gratuitos serán mensuales. Una regeneración no contará inicialmente como un uso adicional.

### Prueba premium

Acceso limitado y no renovable de un usuario gratuito a una tarea premium.

### Plan

Conjunto de capacidades y límites. Se prevén al menos `free` y `paid`.

### Suscripción

Acceso pago gestionado inicialmente mediante Gumroad y activado manualmente por un administrador.

### Solicitud de acceso

Pedido no comercial para obtener una cuenta Free o realizar una consulta. Se
procesa manualmente y se mantiene separado de las compras y suscripciones.

### Archivo

Adjunto privado `.txt` o `.md` asociado a una conversación. Paid o una excepción
individual permiten hasta tres archivos UTF-8 de 1 MB por envío.

### Dictado

Conversión de voz del usuario en texto para enviar al chat. No implica inicialmente guardar grabaciones.

### Archivo de conversación

Operación que oculta una conversación al usuario sin borrarla físicamente.

### Borrado definitivo

Procedimiento que elimina la cuenta y sus datos. Las métricas agregadas y anonimizadas pueden conservarse.

## Roles implementados

### Usuario

- Usa chat y tareas.
- Consulta y archiva su historial.
- Valora respuestas.
- Puede excluir su contenido del análisis.
- Si es premium, exporta conversaciones en Markdown.

### Admin

- Gestiona usuarios y planes.
- Activa manualmente suscripciones.
- Gestiona catálogo, modelos y orden de preferencia.
- Consulta consumo, métricas y alertas.
- No lee conversaciones completas ni administra roles.

### Root

- Tiene las capacidades de admin.
- Puede leer conversaciones completas.
- Gestiona roles y configuración.
- Ejecuta borrados definitivos.

Las acciones administrativas deben quedar auditadas.

## Métricas implementadas

- Usuarios activos.
- Tareas más utilizadas.
- Uso por plan.
- Pruebas premium consumidas.
- Éxito y error por proveedor/modelo.
- Modelo real de cada respuesta.
- Valoraciones útil/no útil.
- Comentarios opcionales.
- Tasa de fallo total de modelos.

Si el usuario excluye su contenido del análisis, se podrán conservar métricas operativas sin contenido. El historial seguirá disponible hasta que se aplique un borrado definitivo.

## Privacidad confirmada

- Se informará que las conversaciones se guardan.
- Se advertirá que no se introduzcan datos sensibles.
- Se informará que proveedores externos procesan las solicitudes.
- El usuario podrá archivar conversaciones.
- Existe un procedimiento root de borrado definitivo con reautenticación,
  consolidación anónima e idempotencia.
- Solo `root` podrá leer conversaciones completas.
- El usuario podrá excluir su contenido del análisis.
- La retención prevista es indefinida, sujeta a mantenimiento futuro.

## Fuera del alcance actual

- Dictado.
- OAuth.
- Preguntas aclaratorias automáticas antes de ejecutar una tarea.
- Prompt avanzado visible/editable.

La interfaz de chat, historial, catálogo, valoraciones, perfil, privacidad y plan
está conectada al esquema. El backoffice está integrado en `/admin` y solamente se
muestra cuando el servidor confirma un rol `admin` o `root`.

## PENDIENTES DE CONFIRMACIÓN

- Nombre y composición final de las categorías.
- Catálogo inicial definitivo.
- Número de usos mensuales.
- Número de pruebas premium.
- Criterios detallados para seleccionar tareas premium.
- Política legal y texto exacto de privacidad.
- Proceso futuro de cobro posterior a Gumroad.

## Cierre operativo implementado

- Los límites mensuales y las pruebas premium se aplican cuando un administrador configura cantidades; sin configuración, los usos mensuales son ilimitados y premium permanece bloqueado para Free.
- Paid dispone de adjuntos TXT/MD privados y exportación Markdown.
- Dictado, OAuth y preguntas aclaratorias automáticas permanecen fuera de alcance.

## Pendientes funcionales conocidos

- Completar edición y baja controlada en todos los CRUD administrativos.
- Incorporar paginación real en auditoría, conversaciones y solicitudes.
- Hacer global la búsqueda de usuarios y mostrar plan y consumo por usuario.
- Procesar solicitudes de borrado directamente desde la cola root.
- Mostrar consumo, límite y próxima renovación en los errores de cuota.
