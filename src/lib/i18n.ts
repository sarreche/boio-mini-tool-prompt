
export const loginI18n = {
  es: {
    title: "Prompt Toolkit",
    welcomeMessage: "¡Bienvenido!",
    languageLabel: "Idioma",
    emailLabel: "Email",
    emailPlaceholder: "Ingrese su email",
    passwordLabel: "Contraseña",
    passwordPlaceholder: "Ingrese su contraseña",
    loginButton: "Ingresar",
    loading: "Ingresando...",
    errorCredentials: "Email o contraseña incorrectos.",
    accountHelp: "Las cuentas son creadas por el administrador.",
  },
  en: {
    title: "Prompt Toolkit",
    welcomeMessage: "Welcome!",
    languageLabel: "Language",
    emailLabel: "Email",
    emailPlaceholder: "Enter your email",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    loginButton: "Login",
    loading: "Signing in...",
    errorCredentials: "Incorrect email or password.",
    accountHelp: "Accounts are created by the administrator.",
  }
};

export const accountI18n = {
  es: {
    title: "Cambiar contraseña",
    description: "Usá una contraseña única de al menos 8 caracteres, con letras y números.",
    passwordLabel: "Nueva contraseña",
    confirmLabel: "Confirmar contraseña",
    save: "Guardar contraseña",
    saving: "Guardando...",
    success: "La contraseña se actualizó correctamente.",
    mismatch: "Las contraseñas no coinciden.",
    tooShort: "La contraseña debe tener al menos 8 caracteres.",
    requirements: "La contraseña debe incluir letras y números.",
    error: "No se pudo actualizar la contraseña.",
    back: "Volver a los prompts",
  },
  en: {
    title: "Change password",
    description: "Use a unique password with at least 8 characters, including letters and numbers.",
    passwordLabel: "New password",
    confirmLabel: "Confirm password",
    save: "Save password",
    saving: "Saving...",
    success: "Your password was updated.",
    mismatch: "Passwords do not match.",
    tooShort: "The password must have at least 8 characters.",
    requirements: "The password must include letters and numbers.",
    error: "The password could not be updated.",
    back: "Back to prompts",
  },
};

export const promptsI18n = {
  es: {
    title: "Botonera de Prompts",
    subtitle: "Tu asistente de IA que siempre responde (solo texto a texto)",
    userInput: "Entrada del usuario",
    userInputPlaceholder: "Escribí tu consulta o usá los botones de abajo...",
    buttonsLabel: "Botonera de prompts",
    execute: "▶ Ejecutar",
    clear: "Limpiar",
    response: "Respuesta",
    changePasswordButton: "Cambiar contraseña",
    logoutButton: 'Salir',
    status: {
      consulting: "Consultando modelos...",
      ready: "Listo (modelo: {0})",
      error: "Error",
      noInput: "Ingresá texto o usá un botón."
    },
    presets: [
        {
          label: "Explicar simple",
          build: (txt: string) => `Explica esto como si tuviera 10 años:\n\n${txt}`
        },
        {
          label: "Resumir en bullets",
          build: (txt: string) => `Resume en 5 puntos:\n\n${txt}`
        },
        {
          label: "Traducir a inglés",
          build: (txt: string) => `Traduce al inglés:\n\n${txt}`
        },
        {
          label: "Mejorar redacción",
          build: (txt: string) => `Reescribe de forma clara y neutral:\n\n${txt}`
        },
        {
          label: "Correo breve",
          build: (txt: string) => `Redacta un email corto y profesional sobre:\n\n${txt}`
        },
        {
          label: "Ideas creativas",
          build: (txt: string) => `Dame 10 ideas creativas sobre:\n\n${txt}`
        },
        {
          label: "Speech de 1 minuto",
          build: (txt: string) => `Ayúdame a preparar un speech de 1 minuto para presentar:\n\n${txt}`
        },
        {
            label: "Cuentos cortos",
            build: (txt: string) => `Inventa un cuento corto para contar a un niño de [edad]:\n\n${txt}`
        },
        {
            label: "Checklist",
            build: (txt: string) => `Dame un checklist de cosas a considerar para:\n\n${txt}`
        },
        {
            label: "Cocinar con...",
            build: (txt: string) => `Decime qué puedo cocinar con estos ingredientes:\n\n${txt}`
        },
        {
            label: "WhatsApp amable",
            build: (txt: string) => `Ayudame a contestar un mensaje de WhatsApp de manera amable:\n\n${txt}`
        },
        {
            label: "Guía rápida",
            build: (txt: string) => `Dame una guía rápida para:\n\n${txt}`
        },
      ],
    systemPrompt: "Sos un asistente claro y práctico en español."
  },
  en: {
    title: "Prompt Toolkit",
    subtitle: "Your AI assistant that always responds (text-to-text only)",
    userInput: "User input",
    userInputPlaceholder: "Write your query or use the buttons below...",
    buttonsLabel: "Prompt buttons",
    execute: "▶ Run",
    clear: "Clear",
    response: "Response",
    changePasswordButton: "Change password",
    logoutButton: 'Logout',
    status: {
      consulting: "Consulting models...",
      ready: "Done (model: {0})",
      error: "Error",
      noInput: "Enter text or use a button."
    },
    presets: [
        {
          label: "Simple explain",
          build: (txt: string) => `Explain this like I'm 10 years old:\n\n${txt}`
        },
        {
          label: "Bullet summary",
          build: (txt: string) => `Summarize in 5 points:\n\n${txt}`
        },
        {
          label: "Translate to Spanish",
          build: (txt: string) => `Translate to Spanish:\n\n${txt}`
        },
        {
          label: "Improve writing",
          build: (txt: string) => `Rewrite this clearly and neutrally:\n\n${txt}`
        },
        {
          label: "Brief email",
          build: (txt: string) => `Write a short professional email about:\n\n${txt}`
        },
        {
          label: "Creative ideas",
          build: (txt: string) => `Give me 10 creative ideas about:\n\n${txt}`
        },
        {
          label: "1-minute speech",
          build: (txt: string) => `Help me prepare a 1-minute speech to speak about:\n\n${txt}`
        },
        {
            label: "Story telling",
            build: (txt: string) => `Make up a short story to tell a child of [age]:\n\n${txt}`
        },
        {
            label: "Checklist",
            build: (txt: string) => `Give me a checklist of things I should take to:\n\n${txt}`
        },
        {
            label: "Cook with...",
            build: (txt: string) => `Tell me what I can cook with those ingredients:\n\n${txt}`
        },
        {
            label: "Polite Reply",
            build: (txt: string) => `Help me reply politely to a WhatsApp message:\n\n${txt}`
        },
        {
            label: "Quick Guide",
            build: (txt: string) => `Give me a quick guide for:\n\n${txt}`
        },
      ],
    systemPrompt: "You are a clear and practical assistant. In English."
  }
};
