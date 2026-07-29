# Dominio y producto

## Propósito

Prompt Toolkit nació cuando construir buenos prompts era una barrera importante para utilizar modelos de lenguaje. Su objetivo es facilitar tareas cotidianas a personas, adultas o no, con poca experiencia tecnológica.

El valor del producto no es enseñar sintaxis de prompts, sino reducir el esfuerzo necesario para obtener un resultado útil.

## Estado actual del producto

El MVP presenta una caja de texto y una botonera de prompts prediseñados. El usuario puede aplicar una transformación, editar el texto resultante y enviarlo a un modelo.

Las tareas actuales incluyen explicación, resumen, traducción, mejora de redacción, correo, ideas, speech, cuentos, checklist, cocina, respuesta de WhatsApp y guía rápida.

No todos los presets están confirmados como parte del catálogo futuro.

## Dirección de producto confirmada

El producto evolucionará hacia:

- Chat como interacción principal.
- Tareas generales para aprender del uso real.
- Entrada libre o inicio desde una tarea.
- Preguntas aclaratorias generadas por el modelo.
- Prompt visible como opción avanzada.
- Conversaciones persistentes y refinables.
- Catálogo ampliable y potencialmente organizado por categorías.
- Métricas de uso y utilidad.
- Plan gratuito y plan pago.

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

### Archivo

Adjunto asociado a una conversación. El soporte inicial previsto es `.txt` y `.md`, condicionado a no introducir costos no aceptados.

### Dictado

Conversión de voz del usuario en texto para enviar al chat. No implica inicialmente guardar grabaciones.

### Archivo de conversación

Operación que oculta una conversación al usuario sin borrarla físicamente.

### Borrado definitivo

Procedimiento que elimina la cuenta y sus datos. Las métricas agregadas y anonimizadas pueden conservarse.

## Roles futuros

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

## Métricas previstas

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
- Existirá un procedimiento de borrado definitivo.
- Solo `root` podrá leer conversaciones completas.
- El usuario podrá excluir su contenido del análisis.
- La retención prevista es indefinida, sujeta a mantenimiento futuro.

## Fuera del alcance actual

- Conversaciones persistentes.
- Perfiles, roles y datos de cuenta adicionales a Supabase Auth.
- Roles.
- Planes aplicados automáticamente.
- Panel administrativo.
- Archivos y dictado.
- Exportación.
- Métricas persistentes.

Son objetivos futuros, no capacidades del MVP.

## PENDIENTES DE CONFIRMACIÓN

- Nombre y composición final de las categorías.
- Catálogo inicial definitivo.
- Número de usos mensuales.
- Número de pruebas premium.
- Criterios detallados para seleccionar tareas premium.
- Política legal y texto exacto de privacidad.
- Proceso futuro de cobro posterior a Gumroad.
