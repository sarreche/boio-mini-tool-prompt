"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Archive, BookOpen, BowlFood, ChatCircle, CheckSquare, ClockCounterClockwise, Copy, DownloadSimple, EnvelopeSimple, Globe, House, Lightbulb, ListBullets, MagicWand, Paperclip, PencilSimple, SquaresFour, ThumbsDown, ThumbsUp, PaperPlaneTilt, Plus, SignOut, Sparkle, Toolbox, Translate, UserCircle, X } from "@phosphor-icons/react";
import { signOut } from "@/lib/auth";
import type { ChatMessage, ConversationSummary, Locale, ProductBootstrap, TaskCard } from "@/lib/product-types";
import { promptsI18n } from "@/lib/i18n";

const copy = {
  es: { title: "¿Qué necesitás resolver hoy?", subtitle: "Elegí una tarea o empezá un chat libre.", placeholder: "Escribí tu consulta o pegá el texto que querés trabajar...", send: "Enviar", stop: "Detener", edit: "Editar", rename: "Cambiar nombre", renamePlaceholder: "Nombre de la conversación", copy: "Copiar", copied: "Copiado", tools: "Herramientas", chooseTool: "Cambiar de tarea", regenerate: "Regenerar", newChat: "Nueva conversación", history: "Historial", tasks: "Tareas", loadingTasks: "Cargando tareas...", noHistory: "Todavía no hay conversaciones.", loading: "Preparando tu respuesta...", loadingNote: "Podés quedarte acá; te avisamos cuando esté lista.", error: "No pudimos completar la solicitud.", plan: "Plan", settings: "Perfil y privacidad", save: "Guardar", saving: "Guardando...", saved: "Cambios guardados", changePassword: "Cambiar contraseña", displayName: "Nombre", timezone: "Zona horaria", optOut: "Excluir el contenido de mis conversaciones del análisis", deletion: "Solicitar borrado definitivo", deletionOpen: "Solicitud de borrado abierta", archive: "Archivar conversación", useful: "¿Te sirvió?", logout: "Salir", empty: "Elegí una tarea o escribí directamente para comenzar.", account: "Cuenta" },
  en: { title: "What do you need help with today?", subtitle: "Choose a task or start a free-form chat.", placeholder: "Write your request or paste the text you want to work with...", send: "Send", stop: "Stop", edit: "Edit", rename: "Rename", renamePlaceholder: "Conversation name", copy: "Copy", copied: "Copied", tools: "Tools", chooseTool: "Change task", regenerate: "Regenerate", newChat: "New conversation", history: "History", tasks: "Tasks", loadingTasks: "Loading tasks...", noHistory: "There are no conversations yet.", loading: "Preparing your response...", loadingNote: "You can stay here; we'll let you know when it's ready.", error: "We could not complete the request.", plan: "Plan", settings: "Profile and privacy", save: "Save", saving: "Saving...", saved: "Changes saved", changePassword: "Change password", displayName: "Name", timezone: "Timezone", optOut: "Exclude my conversation content from analysis", deletion: "Request permanent deletion", deletionOpen: "Deletion request open", archive: "Archive conversation", useful: "Was this useful?", logout: "Log out", empty: "Choose a task or write directly to get started.", account: "Account" },
};

const taskIcons = { explain_simple: Sparkle, summarize: ListBullets, translate: Translate, quick_guide: BookOpen, improve_writing: PencilSimple, brief_email: EnvelopeSimple, polite_reply: MagicWand, one_minute_speech: Globe, creative_ideas: Lightbulb, short_story: BookOpen, checklist: CheckSquare, cook_with: BowlFood } as const;

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-4 mt-7 text-3xl font-bold tracking-tight first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-6 text-2xl font-bold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-5 text-xl font-bold first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-3 leading-7 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-[#10182b]">{children}</strong>,
  hr: () => <hr className="my-6 border-[#d9dee7]" />,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-[#9bbaff] bg-[#f4f7ff] px-4 py-2 text-[#40516f]">{children}</blockquote>,
  table: ({ children }) => <div className="my-5 overflow-x-auto"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
  th: ({ children }) => <th className="border border-[#cfd6e1] bg-[#f4f6f9] px-3 py-2 font-bold">{children}</th>,
  td: ({ children }) => <td className="border border-[#cfd6e1] px-3 py-2 align-top">{children}</td>,
  code: ({ children, className }) => className
    ? <code className={`${className} block overflow-x-auto rounded-xl bg-[#10182b] p-4 text-sm leading-6 text-white`}>{children}</code>
    : <code className="rounded bg-[#edf1f7] px-1.5 py-0.5 text-sm text-[#084ad4]">{children}</code>,
};

export default function PromptsPage({ initialLang, adminRole }: { initialLang: Locale; adminRole: "admin" | "root" | null }) {
  const router = useRouter();
  const [lang, setLang] = useState<Locale>(initialLang);
  const [data, setData] = useState<ProductBootstrap | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskCard | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [attachments, setAttachments] = useState<{ id: string; name: string }[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const t = copy[lang];
  const ui = promptsI18n[lang];

  const loadBootstrap = useCallback(async () => {
    const response = await fetch(`/api/app-data?locale=${lang}`, { cache: "no-store" });
    if (response.status === 401) { router.replace(`/login?lang=${lang}`); return; }
    if (!response.ok) { setError(t.error); return; }
    setData(await response.json());
  }, [lang, router, t.error]);

  useEffect(() => { void loadBootstrap(); }, [loadBootstrap]);

  const categories = useMemo(() => {
    const grouped = new Map<string, { name: string; description: string | null; tasks: TaskCard[] }>();
    for (const task of data?.tasks ?? []) {
      const group = grouped.get(task.categoryCode) ?? { name: task.categoryName, description: task.categoryDescription, tasks: [] };
      group.tasks.push(task); grouped.set(task.categoryCode, group);
    }
    return [...grouped.entries()];
  }, [data?.tasks]);

  async function openConversation(id: string) {
    setBusy(true); setError("");
    const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
    if (response.ok) { const conversation = await response.json(); setConversationId(id); setMessages(conversation.messages); setSelectedTask(data?.tasks.find((task) => task.id === conversation.initialTaskId) ?? null); }
    else setError(t.error);
    setBusy(false);
  }

  function startNewChat(task: TaskCard | null = null) { setConversationId(null); setMessages([]); setSelectedTask(task); setInput(""); setAttachments([]); setError(""); }

  async function uploadAttachments(files: FileList | null) {
    if (!files?.length) return;
    const form = new FormData(); if(conversationId)form.set("conversationId", conversationId);
    [...files].slice(0, 3).forEach((file) => form.append("files", file));
    const response = await fetch("/api/attachments", { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) { setError(result.error || t.error); return; }
    if(result.conversationId)setConversationId(result.conversationId);
    setAttachments((current) => [...current, ...result.attachments].slice(0, 3));
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault(); const trimmed = input.trim(); if (!trimmed || busy) return; await submitMessage(trimmed);
  }

  async function submitMessage(trimmed: string, regenerationOfExecutionId?: string) {
    const controller = new AbortController();
    controllerRef.current = controller;
    const optimistic: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed, sequenceNumber: messages.length, createdAt: new Date().toISOString(), rating: null };
    if (!regenerationOfExecutionId) setMessages((current) => [...current, optimistic]); setInput(""); setBusy(true); setError("");
    try {
      const response = await fetch("/api/inference", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: trimmed, locale: lang, taskCode: selectedTask?.code, conversationId, regenerationOfExecutionId, attachmentIds: attachments.map((item) => item.id), clientRequestId: crypto.randomUUID() }), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) { setError(result.error || t.error); return; }
      setConversationId(result.conversationId);
      setAttachments([]);
      setMessages((current) => [...current.filter((message) => message.id !== optimistic.id), ...(regenerationOfExecutionId ? [] : [{ ...optimistic, id: result.requestMessageId }]), { id: result.responseMessageId, role: "assistant", content: result.text, sequenceNumber: current.length + 1, createdAt: new Date().toISOString(), rating: null, executionId: result.executionId }]);
      await loadBootstrap();
    } catch (requestError) {
      if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError(t.error);
    } finally {
      setBusy(false);
      controllerRef.current = null;
    }
  }

  function stopGeneration() {
    controllerRef.current?.abort();
    setBusy(false);
  }

  function editMessage(message: ChatMessage) {
    if (busy) stopGeneration();
    setInput(message.content);
    window.setTimeout(() => document.getElementById("chat-composer")?.focus(), 0);
  }

  async function regenerate(message: ChatMessage) {
    if (!message.executionId) return;
    const index = messages.findIndex((item) => item.id === message.id);
    const original = messages.slice(0, index).toReversed().find((item) => item.role === "user");
    if (original) await submitMessage(original.content, message.executionId);
  }

  async function archiveConversation() {
    if (!conversationId) return;
    const response = await fetch(`/api/conversations/${conversationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: true }) });
    if (response.ok) { startNewChat(); await loadBootstrap(); } else setError(t.error);
  }

  async function archiveConversationFromHistory(id: string) {
    const response = await fetch(`/api/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: true }) });
    if (!response.ok) { setError(t.error); return; }
    if (conversationId === id) startNewChat();
    await loadBootstrap();
  }

  async function renameConversation(id: string) {
    const title = editingTitle.trim();
    if (!title) return;
    const response = await fetch(`/api/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    if (!response.ok) { setError(t.error); return; }
    setEditingConversationId(null);
    setEditingTitle("");
    await loadBootstrap();
  }

  async function rateMessage(messageId: string, isHelpful: boolean) {
    const response = await fetch("/api/ratings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId, isHelpful }) });
    if (!response.ok) return;
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, rating: { isHelpful, comment: null } } : message));
  }

  async function copyMessage(message: ChatMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);
    window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 1800);
  }

  async function handleSignOut() { await signOut(); router.replace(`/login?lang=${lang}`); router.refresh(); }

  return (
    <main className="min-h-screen bg-[#fbfbf9] text-[#10182b] [&_button:not(:disabled)]:cursor-pointer lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="hidden min-h-screen flex-col border-r border-[#e1e5ec] bg-white px-5 py-7 lg:flex">
        <button onClick={() => startNewChat()} className="flex items-center gap-3 px-2 text-left"><Image src="/prompt-toolkit-logo.png" alt="" width={48} height={48} priority /><span className="text-xl font-bold leading-5">Prompt<br />Toolkit</span></button>
        <button onClick={() => startNewChat()} className="mt-10 flex min-h-14 items-center gap-3 rounded-xl bg-[#1261ff] px-5 text-left font-bold text-white hover:bg-[#084ad4]"><Plus size={22} weight="bold" />{ui.newConversation}</button>
        <nav className="mt-7 space-y-1" aria-label={lang === "es" ? "Navegación principal" : "Main navigation"}>
          <button onClick={() => startNewChat()} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 font-semibold text-[#1261ff] hover:bg-[#f0f5ff]"><House size={22} />{ui.home}</button>
          <button onClick={() => { startNewChat(); window.setTimeout(() => document.getElementById("task-catalog")?.scrollIntoView({ behavior: "smooth" }), 0); }} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-[#40516f] hover:bg-[#f4f6f9]"><SquaresFour size={22} />{ui.allTasks}</button>
          {adminRole ? <Link href="/admin" className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 font-bold text-[#40516f] hover:bg-[#f4f6f9]"><SquaresFour size={22} />{lang === "es" ? "Administración" : "Administration"}</Link> : null}
        </nav>
        <div className="my-5 h-px bg-[#e1e5ec]" />
        <div className="min-h-0 flex-1 overflow-y-auto px-3"><h2 className="flex items-center gap-3 font-bold"><ClockCounterClockwise size={22} />{ui.history}</h2><nav className="mt-3 space-y-1">{(data?.conversations ?? []).map((conversation: ConversationSummary) => editingConversationId === conversation.id ? <form key={conversation.id} onSubmit={(event) => { event.preventDefault(); void renameConversation(conversation.id); }} className="rounded-xl border border-[#9bbaff] bg-white p-2 shadow-sm"><label className="sr-only" htmlFor={`conversation-title-${conversation.id}`}>{t.renamePlaceholder}</label><input id={`conversation-title-${conversation.id}`} value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} maxLength={120} autoFocus className="w-full rounded-lg border border-[#d9dee7] px-2 py-2 text-sm focus:border-[#1261ff] focus:outline-none" /><div className="mt-1 flex justify-end gap-1"><button type="button" onClick={() => setEditingConversationId(null)} className="rounded-lg p-2 text-[#60708f] hover:bg-[#f4f6f9]" aria-label={lang === "es" ? "Cancelar" : "Cancel"}><X size={17} /></button><button type="submit" disabled={!editingTitle.trim()} className="rounded-lg bg-[#1261ff] px-3 py-2 text-xs font-bold text-white hover:bg-[#084ad4] disabled:opacity-45">{t.save}</button></div></form> : <div key={conversation.id} className={`group relative rounded-xl ${conversationId === conversation.id ? "bg-[#edf3ff] text-[#084ad4]" : "hover:bg-[#f4f6f9]"}`}><button type="button" onClick={() => void openConversation(conversation.id)} className={`min-h-12 w-full truncate rounded-xl py-3 pl-3 pr-20 text-left text-sm ${conversationId === conversation.id ? "font-bold" : ""}`}>{conversation.title || ui.newConversation}</button><div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center rounded-lg bg-inherit opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><button type="button" onClick={() => { setEditingConversationId(conversation.id); setEditingTitle(conversation.title || ui.newConversation); }} className="flex min-h-10 min-w-9 items-center justify-center rounded-lg text-[#60708f] hover:bg-white hover:text-[#1261ff]" aria-label={`${t.rename}: ${conversation.title || ui.newConversation}`} title={t.rename}><PencilSimple size={17} /></button><button type="button" onClick={() => void archiveConversationFromHistory(conversation.id)} className="flex min-h-10 min-w-9 items-center justify-center rounded-lg text-[#60708f] hover:bg-white hover:text-[#1261ff]" aria-label={`${t.archive}: ${conversation.title || ui.newConversation}`} title={t.archive}><Archive size={17} /></button></div></div>)}{data && data.conversations.length === 0 ? <p className="py-3 text-sm leading-6 text-[#60708f]">{ui.emptyHistory}</p> : null}</nav></div>
        <div className="mt-5 border-t border-[#e1e5ec] px-3 pt-5"><div className="flex gap-3"><UserCircle size={38} className="shrink-0 text-[#60708f]" /><div><p className="font-bold">{t.plan}: {data?.plan.name ?? "…"}</p><p className="mt-1 text-xs leading-5 text-[#60708f]">{ui.planDescription}</p></div></div><Link href={`/plans?lang=${lang}`} className="mt-3 flex min-h-11 items-center text-sm font-bold text-[#1261ff] hover:underline">{ui.premium}</Link></div>
      </aside>

      <section className="min-w-0 px-4 pb-12 pt-4 sm:px-7 lg:px-10 xl:px-16">
        <header className="flex min-h-14 items-center justify-between gap-4"><div className="flex items-center gap-2 lg:hidden"><Image src="/prompt-toolkit-logo.png" alt="" width={40} height={40} priority /><span className="font-bold">Prompt Toolkit</span></div><div className="ml-auto flex items-center gap-2">{adminRole ? <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-bold text-[#1261ff] hover:bg-[#edf3ff]">{lang === "es" ? "Administración" : "Administration"}</Link> : null}<label className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[#40516f] hover:bg-[#f0f4fb]"><Globe size={21} /><span className="sr-only">{ui.languageLabel}</span><select value={lang} onChange={(event) => { const next=event.target.value as Locale; setLang(next); router.replace(`/prompts?lang=${next}`); }} className="bg-transparent"><option value="es">ES</option><option value="en">EN</option></select></label><button onClick={() => setShowSettings(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#d9dee7] bg-white text-[#40516f] hover:bg-[#f4f6f9]" aria-label={ui.accountLabel}><UserCircle size={27} /></button></div></header>

        <div className="mx-auto mt-6 max-w-6xl">
          {messages.length === 0 ? <>
            <Sparkle size={34} weight="fill" className="text-[#f5b700]" /><h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{ui.title}</h1><p className="mt-3 text-lg text-[#60708f]">{ui.subtitle}</p>
            {data?.access.attachments.enabled&&!conversationId?<label className="mt-5 flex w-fit cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#1261ff] hover:bg-[#edf3ff]"><Paperclip size={20}/>Adjuntar TXT/MD<input type="file" accept=".txt,.md,text/plain,text/markdown" multiple className="sr-only" disabled={busy} onChange={event=>{void uploadAttachments(event.target.files);event.currentTarget.value="";}}/></label>:null}
            <Composer t={t} input={input} setInput={setInput} busy={busy} selectedTask={selectedTask} tasks={data?.tasks ?? []} conversationId={conversationId} attachments={attachments} attachmentsEnabled={Boolean(data?.access.attachments.enabled)} exportEnabled={Boolean(data?.access.conversationExport.enabled)} onFiles={uploadAttachments} onSubmit={sendMessage} onArchive={archiveConversation} onSelectTask={setSelectedTask} onStop={stopGeneration} />
            {data ? <div id="task-catalog" className="mt-8 space-y-7">{categories.map(([code, category]) => <section key={code}><div className="mb-4"><h2 className="text-xl font-bold">{category.name}</h2><p className="mt-1 text-sm text-[#60708f]">{category.description}</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{category.tasks.map((task) => <button key={task.id} onClick={() => setSelectedTask(task)} aria-pressed={selectedTask?.id === task.id} className={`min-h-24 rounded-2xl border p-4 text-left transition-colors ${selectedTask?.id === task.id ? "border-[#1261ff] bg-[#edf3ff]" : "border-[#d9dee7] bg-white hover:border-[#9bbaff] hover:bg-[#f8faff]"}`}><ChatCircle size={27} className="text-[#1261ff]" /><h3 className="mt-3 font-bold">{task.name}</h3><p className="mt-1 text-sm leading-5 text-[#60708f]">{task.description}</p></button>)}</div></section>)}</div> : <TaskCatalogSkeleton label={t.loadingTasks} />}
          </> : <>
            <div className="space-y-6">{messages.map((message) => <article key={message.id} className="max-w-5xl">
              <div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold">{message.role === "user" ? ui.yourRequest : <><Sparkle size={24} className="text-[#1261ff]" weight="fill" />{ui.assistant}</>}</h2>{message.role === "user" ? <button type="button" onClick={() => editMessage(message)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#1261ff] hover:bg-[#edf3ff] focus:ring-4 focus:ring-[#1261ff]/15"><PencilSimple size={18} />{t.edit}</button> : null}</div>
              <div className={`rounded-2xl border p-5 sm:p-7 ${message.role === "user" ? "border-[#d9dee7] bg-white" : "border-[#bcd0ff] bg-white"}`}><ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</ReactMarkdown>{message.role === "assistant" ? <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#e1e5ec] pt-4 text-sm text-[#60708f]"><button type="button" onClick={() => void copyMessage(message)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-[#40516f] hover:bg-[#f4f6f9] focus:ring-4 focus:ring-[#1261ff]/15"><Copy size={19} />{copiedMessageId === message.id ? t.copied : t.copy}</button>{message.executionId ? <button onClick={() => void regenerate(message)} disabled={busy} className="rounded-lg px-3 py-2 font-bold hover:bg-[#f4f6f9]">{t.regenerate}</button> : null}<span className="ml-auto">{t.useful}</span><button onClick={() => void rateMessage(message.id,true)} className={`rounded-lg p-2 ${message.rating?.isHelpful === true ? "bg-[#edf3ff] text-[#1261ff]" : "hover:bg-[#f4f6f9]"}`}><ThumbsUp size={20} /></button><button onClick={() => void rateMessage(message.id,false)} className={`rounded-lg p-2 ${message.rating?.isHelpful === false ? "bg-red-50 text-red-700" : "hover:bg-[#f4f6f9]"}`}><ThumbsDown size={20} /></button></div> : null}</div>
            </article>)}</div>
            {busy ? <section className="mt-6 max-w-5xl" role="status" aria-live="polite"><h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Sparkle size={24} className="text-[#1261ff]" weight="fill" />{ui.assistant}</h2><div className="flex items-center gap-5 rounded-2xl border border-[#9bbaff] bg-[#f4f7ff] p-6 sm:p-7"><span className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-[#bcd0ff] border-b-[#1261ff]" aria-hidden="true" /><div><p className="text-lg font-bold">{t.loading}</p><p className="mt-1 text-[#60708f]">{t.loadingNote}</p></div></div></section> : null}
            <Composer t={t} input={input} setInput={setInput} busy={busy} selectedTask={selectedTask} tasks={data?.tasks ?? []} conversationId={conversationId} attachments={attachments} attachmentsEnabled={Boolean(data?.access.attachments.enabled)} exportEnabled={Boolean(data?.access.conversationExport.enabled)} onFiles={uploadAttachments} onSubmit={sendMessage} onArchive={archiveConversation} onSelectTask={setSelectedTask} onStop={stopGeneration} />
          </>}
          {error ? <p className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}
        </div>
      </section>
      {showSettings && data ? <SettingsDialog data={data} lang={lang} onClose={() => setShowSettings(false)} onSaved={(next) => { setData((current) => current ? { ...current, profile: next } : current); setSettingsStatus(t.saved); }} onDeletion={(request) => setData((current) => current ? { ...current, deletionRequest: request } : current)} status={settingsStatus} onSignOut={handleSignOut} /> : null}
    </main>
  );
}

function TaskCatalogSkeleton({ label }: { label: string }) {
  return <div id="task-catalog" className="mt-8 space-y-7" role="status" aria-live="polite" aria-busy="true"><span className="sr-only">{label}</span>{[0, 1, 2].map((category) => <section key={category} aria-hidden="true" className="animate-pulse"><div className="mb-4"><div className="h-6 w-52 rounded-md bg-[#e5e9f0]" /><div className="mt-2 h-4 w-72 max-w-[70%] rounded bg-[#edf0f5]" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((card) => <div key={card} className="min-h-28 rounded-2xl border border-[#e1e5ec] bg-white p-4"><div className="h-7 w-7 rounded-full bg-[#dce6fb]" /><div className="mt-3 h-5 w-2/3 rounded bg-[#e5e9f0]" /><div className="mt-2 h-4 w-5/6 rounded bg-[#edf0f5]" /></div>)}</div></section>)}</div>;
}

function Composer({ t, input, setInput, busy, selectedTask, tasks, conversationId, attachments, attachmentsEnabled, exportEnabled, onFiles, onSubmit, onArchive, onSelectTask, onStop }: { t: typeof copy.es; input: string; setInput: (value: string) => void; busy: boolean; selectedTask: TaskCard | null; tasks: TaskCard[]; conversationId: string | null; attachments: {id:string;name:string}[]; attachmentsEnabled:boolean; exportEnabled:boolean; onFiles:(files:FileList|null)=>void; onSubmit: (event: React.FormEvent) => void; onArchive: () => void; onSelectTask: (task: TaskCard | null) => void; onStop: () => void }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  return <form onSubmit={onSubmit} className="relative mt-7 rounded-2xl border border-[#d9dee7] bg-white p-4 focus-within:border-[#1261ff] focus-within:ring-4 focus-within:ring-[#1261ff]/10 sm:p-5"><textarea id="chat-composer" value={input} onChange={(event) => setInput(event.target.value)} placeholder={t.placeholder} rows={4} className="w-full resize-y bg-transparent text-base leading-7 placeholder:text-[#8b97aa] focus:outline-none" />{attachments.length?<p className="mt-2 text-sm text-[#40516f]">{attachments.map(a=>a.name).join(" · ")}</p>:null}<div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy} onClick={() => setToolsOpen((open) => !open)} aria-expanded={toolsOpen} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#60708f] hover:bg-[#f4f6f9] focus:ring-4 focus:ring-[#1261ff]/15 disabled:cursor-not-allowed disabled:opacity-45"><Toolbox size={20} />{t.tools}</button>{attachmentsEnabled?<label title={!conversationId?"Send the first message before attaching files":"TXT/MD, max 3 × 1 MB"} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold ${conversationId&&!busy?"cursor-pointer text-[#60708f] hover:bg-[#f4f6f9]":"text-[#9aa4b5]"}`}><Paperclip size={20}/><span>TXT/MD</span><input type="file" accept=".txt,.md,text/plain,text/markdown" multiple className="sr-only" disabled={!conversationId||busy} onChange={e=>{void onFiles(e.target.files);e.currentTarget.value="";}}/></label>:null}{conversationId&&exportEnabled?<a href={`/api/conversations/${conversationId}/export`} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#60708f] hover:bg-[#f4f6f9]"><DownloadSimple size={20}/>Markdown</a>:null}{selectedTask ? <span className="rounded-lg bg-[#edf3ff] px-3 py-2 text-sm font-bold text-[#084ad4]">{selectedTask.name}</span> : null}{conversationId ? <button type="button" onClick={() => void onArchive()} className="rounded-lg px-3 py-2 text-sm font-bold text-[#60708f] hover:bg-[#f4f6f9]"><Archive size={17} className="mr-1 inline" />{t.archive}</button> : null}</div>{busy ? <button type="button" onClick={onStop} className="flex min-h-12 items-center gap-2 rounded-xl border border-[#1261ff] px-6 font-bold text-[#1261ff] hover:bg-[#edf3ff]"><X size={20} />{t.stop}</button> : <button disabled={!input.trim()} className="flex min-h-12 items-center gap-2 rounded-xl bg-[#1261ff] px-6 font-bold text-white hover:bg-[#084ad4] disabled:cursor-not-allowed disabled:opacity-45"><PaperPlaneTilt size={21} weight="bold" />{t.send}</button>}</div>{toolsOpen && !busy ? <div className="absolute bottom-20 left-4 z-20 w-[min(560px,calc(100%-2rem))] rounded-2xl border border-[#d9dee7] bg-white p-3 shadow-xl"><p className="px-2 pb-2 text-sm font-bold text-[#10182b]">{t.chooseTool}</p><div className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2"><button type="button" onClick={() => { onSelectTask(null); setToolsOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm text-[#40516f] hover:bg-[#f4f6f9]"><ChatCircle size={19} className="shrink-0 text-[#1261ff]" />{t.placeholder}</button>{tasks.map((task) => { const Icon = taskIcons[task.code as keyof typeof taskIcons] ?? ChatCircle; return <button key={task.id} type="button" onClick={() => { onSelectTask(task); setToolsOpen(false); }} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm ${selectedTask?.id === task.id ? "bg-[#edf3ff] font-bold text-[#084ad4]" : "text-[#40516f] hover:bg-[#f4f6f9]"}`}><Icon size={19} className="shrink-0 text-[#1261ff]" />{task.name}</button>; })}</div></div> : null}</form>;
}

function SettingsDialog({ data, lang, onClose, onSaved, onDeletion, status, onSignOut }: { data: ProductBootstrap; lang: Locale; onClose: () => void; onSaved: (profile: ProductBootstrap["profile"]) => void; onDeletion: (request: ProductBootstrap["deletionRequest"]) => void; status: string; onSignOut: () => void }) {
  const t = copy[lang]; const [name, setName] = useState(data.profile.displayName ?? ""); const [timezone, setTimezone] = useState(data.profile.timezone); const [optOut, setOptOut] = useState(data.profile.analyticsContentOptOut); const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent) { event.preventDefault(); setBusy(true); const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name, timezone, locale: lang, analyticsContentOptOut: optOut }) }); if (response.ok) { const value = await response.json(); onSaved({ displayName: value.display_name, locale: value.locale, timezone: value.timezone, analyticsContentOptOut: value.analytics_content_opt_out }); } setBusy(false); }
  async function requestDeletion() { setBusy(true); const response = await fetch("/api/account", { method: "POST" }); if (response.ok) onDeletion(await response.json()); setBusy(false); }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10182b]/45 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 id="settings-title" className="text-2xl font-bold">{t.settings}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[#f1f4f8]" aria-label="Close"><X size={22} /></button></div><form onSubmit={save} className="mt-6 space-y-4"><label className="block text-sm font-bold">{t.displayName}<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#cfd6e1] px-4 font-normal" /></label><label className="block text-sm font-bold">{t.timezone}<input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#cfd6e1] px-4 font-normal" /></label><label className="flex gap-3 rounded-xl bg-[#f4f7ff] p-4 text-sm"><input type="checkbox" checked={optOut} onChange={(event) => setOptOut(event.target.checked)} className="mt-1" /><span>{t.optOut}</span></label>{status ? <p className="text-sm text-emerald-700" role="status">{status}</p> : null}<button disabled={busy} className="min-h-12 w-full rounded-xl bg-[#1261ff] font-bold text-white transition hover:bg-[#084ad4] active:translate-y-px focus:ring-4 focus:ring-[#1261ff]/20 disabled:cursor-wait disabled:opacity-65">{busy ? t.saving : t.save}</button></form><div className="mt-6 border-t border-[#e1e5ec] pt-5"><Link href={`/account/password?lang=${lang}`} className="flex min-h-11 items-center text-sm font-bold text-[#1261ff] hover:underline">{t.changePassword}</Link>{data.deletionRequest ? <p className="mt-2 text-sm font-bold text-amber-700">{t.deletionOpen}: {data.deletionRequest.status}</p> : <button type="button" onClick={() => void requestDeletion()} disabled={busy} className="mt-2 min-h-11 text-sm font-bold text-red-700 hover:underline">{t.deletion}</button>}<button type="button" onClick={() => void onSignOut()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#cfd6e1] bg-white px-4 text-sm font-bold text-[#40516f] hover:border-[#9bbaff] hover:bg-[#f4f6f9] focus:ring-4 focus:ring-[#1261ff]/15"><SignOut size={20} />{t.logout}</button></div></section></div>;
}
