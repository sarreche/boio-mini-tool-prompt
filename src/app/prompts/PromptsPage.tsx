"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  BowlFood,
  CheckSquare,
  ClockCounterClockwise,
  Copy,
  EnvelopeSimple,
  Globe,
  House,
  Lightbulb,
  ListBullets,
  MagicWand,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  SignOut,
  Sparkle,
  SquaresFour,
  Toolbox,
  ThumbsDown,
  ThumbsUp,
  Translate,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { promptsI18n } from "@/lib/i18n";
import { signOut } from "@/lib/auth";

const taskIcons = [
  Sparkle, ListBullets, Translate, BookOpen,
  PencilSimple, EnvelopeSimple, MagicWand, Globe,
  Lightbulb, BookOpen, CheckSquare, BowlFood,
];

export default function PromptsClient({ initialLang }: { initialLang: "es" | "en" }) {
  const [currentLang, setCurrentLang] = useState<"es" | "en">(initialLang ?? "es");
  const [userInput, setUserInput] = useState("");
  const [submittedInput, setSubmittedInput] = useState("");
  const [output, setOutput] = useState("");
  const [requestError, setRequestError] = useState(false);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const t = promptsI18n[currentLang];

  async function handleRun() {
    const trimmedInput = userInput.trim();
    if (!trimmedInput) {
      window.alert(t.status.noInput);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setSubmittedInput(trimmedInput);
    setOutput("");
    setRequestError(false);
    setCopied(false);
    setFeedback(null);
    setLoading(true);

    const prompt = selectedTask === null ? trimmedInput : t.presets[selectedTask].build(trimmedInput);

    try {
      const response = await fetch("/api/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, lang: currentLang, systemPrompt: t.systemPrompt }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setOutput(data.text.trim());
      setUserInput("");
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Inference request failed:", error);
      setRequestError(true);
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  }

  function handleStop() {
    controllerRef.current?.abort();
    setLoading(false);
  }

  function handleNewConversation() {
    controllerRef.current?.abort();
    setUserInput("");
    setSubmittedInput("");
    setOutput("");
    setRequestError(false);
    setSelectedTask(null);
    setLoading(false);
    setCopied(false);
    setFeedback(null);
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleLogout() {
    const { error } = await signOut();
    if (error) {
      console.error("Supabase logout failed:", error.code);
      return;
    }
    window.location.href = "/login";
  }

  const hasConversation = Boolean(submittedInput || loading || output);
  const activeTaskLabel = selectedTask === null
    ? (currentLang === "es" ? "Consulta libre" : "Open request")
    : t.presets[selectedTask].label;

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-[#10182b] lg:grid lg:grid-cols-[272px_1fr]">
      <Sidebar
        t={t}
        lang={currentLang}
        hasConversation={hasConversation}
        activeTaskLabel={activeTaskLabel}
        onNew={handleNewConversation}
      />

      <main className="min-w-0 px-4 pb-12 pt-4 sm:px-7 lg:px-10 xl:px-16">
        <Topbar
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          t={t}
          onLogout={handleLogout}
        />

        {hasConversation ? (
          <ConversationView
            t={t}
            submittedInput={submittedInput}
            output={output}
            requestError={requestError}
            loading={loading}
            activeTaskLabel={activeTaskLabel}
            userInput={userInput}
            setUserInput={setUserInput}
            onRun={handleRun}
            onStop={handleStop}
            onEdit={() => {
              setSubmittedInput("");
              setOutput("");
            }}
            copied={copied}
            onCopy={handleCopy}
            feedback={feedback}
            setFeedback={setFeedback}
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
          />
        ) : (
          <HomeView
            t={t}
            userInput={userInput}
            setUserInput={setUserInput}
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
            onRun={handleRun}
          />
        )}
      </main>
    </div>
  );
}

type CopyText = typeof promptsI18n.es | typeof promptsI18n.en;

function Sidebar({ t, lang, hasConversation, activeTaskLabel, onNew }: {
  t: CopyText;
  lang: "es" | "en";
  hasConversation: boolean;
  activeTaskLabel: string;
  onNew: () => void;
}) {
  return (
    <aside className="hidden min-h-screen flex-col border-r border-[#e1e5ec] bg-white px-5 py-7 lg:flex">
      <div className="flex items-center gap-3 px-2">
        <Image src="/prompt-toolkit-logo.png" alt="" width={48} height={48} priority />
        <span className="text-xl font-bold leading-5 tracking-[-0.02em]">Prompt<br />Toolkit</span>
      </div>
      <button onClick={onNew} className="mt-10 flex min-h-14 items-center gap-3 rounded-xl bg-[#1261ff] px-5 text-left font-bold text-white hover:bg-[#084ad4] focus:ring-4 focus:ring-[#1261ff]/20">
        <Plus size={22} weight="bold" aria-hidden /> {t.newConversation}
      </button>
      <nav className="mt-7 space-y-1" aria-label={lang === "es" ? "Navegación principal" : "Main navigation"}>
        <button onClick={onNew} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 font-semibold text-[#1261ff] hover:bg-[#f0f5ff]">
          <House size={22} aria-hidden /> {t.home}
        </button>
        <button className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-[#40516f] hover:bg-[#f4f6f9]">
          <SquaresFour size={22} aria-hidden /> {t.allTasks}
        </button>
      </nav>
      <div className="my-5 h-px bg-[#e1e5ec]" />
      <div className="px-3">
        <h2 className="flex items-center gap-3 font-bold"><ClockCounterClockwise size={22} aria-hidden /> {t.history}</h2>
        {hasConversation ? (
          <div className="mt-4 rounded-xl bg-[#edf3ff] p-3">
            <p className="line-clamp-2 text-sm font-bold">{activeTaskLabel}</p>
            <p className="mt-1 text-xs text-[#60708f]">{t.newConversation}</p>
          </div>
        ) : null}
        <p className="mt-4 text-sm leading-6 text-[#60708f]">{t.emptyHistory}</p>
      </div>
      <div className="mt-auto border-t border-[#e1e5ec] px-3 pt-5">
        <div className="flex gap-3">
          <UserCircle size={38} className="shrink-0 text-[#60708f]" aria-hidden />
          <div>
            <p className="font-bold">{t.plan}</p>
            <p className="mt-1 text-xs leading-5 text-[#60708f]">{t.planDescription}</p>
          </div>
        </div>
        <Link href={`/plans?lang=${lang}`} className="mt-3 flex min-h-11 items-center text-sm font-bold text-[#1261ff] hover:underline">{t.premium}</Link>
      </div>
    </aside>
  );
}

function Topbar({ currentLang, setCurrentLang, t, onLogout }: {
  currentLang: "es" | "en";
  setCurrentLang: (lang: "es" | "en") => void;
  t: CopyText;
  onLogout: () => void;
}) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-4">
      <div className="flex items-center gap-2 lg:hidden">
        <Image src="/prompt-toolkit-logo.png" alt="" width={40} height={40} priority />
        <span className="font-bold">Prompt Toolkit</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <label className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[#40516f] hover:bg-[#f0f4fb]">
          <Globe size={21} aria-hidden />
          <span className="sr-only">{t.languageLabel}</span>
          <select value={currentLang} onChange={(event) => setCurrentLang(event.target.value as "es" | "en")} className="bg-transparent" aria-label={t.languageLabel}>
            <option value="es">ES</option><option value="en">EN</option>
          </select>
        </label>
        <details className="relative">
          <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-full border border-[#d9dee7] bg-white text-[#40516f] hover:bg-[#f4f6f9]" aria-label={t.accountLabel}>
            <UserCircle size={27} aria-hidden />
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-[#d9dee7] bg-white p-2 shadow-lg">
            <Link href={`/account/password?lang=${currentLang}`} className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-[#f4f6f9]">{t.changePasswordButton}</Link>
            <button onClick={onLogout} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-red-700 hover:bg-red-50"><SignOut size={18} /> {t.logoutButton}</button>
          </div>
        </details>
      </div>
    </header>
  );
}

function HomeView({ t, userInput, setUserInput, selectedTask, setSelectedTask, onRun }: {
  t: CopyText;
  userInput: string;
  setUserInput: (text: string) => void;
  selectedTask: number | null;
  setSelectedTask: (index: number | null) => void;
  onRun: () => void;
}) {
  return (
    <div className="mx-auto mt-6 max-w-6xl">
      <Sparkle size={34} weight="fill" className="text-[#f5b700]" aria-hidden />
      <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{t.title}</h1>
      <p className="mt-3 text-lg text-[#60708f]">{t.subtitle}</p>
      <div className="mt-7 rounded-2xl border border-[#d9dee7] bg-white p-4 focus-within:border-[#1261ff] focus-within:ring-4 focus-within:ring-[#1261ff]/10 sm:p-5">
        <textarea value={userInput} onChange={(event) => setUserInput(event.target.value)} placeholder={t.inputPlaceholder} rows={4} className="w-full resize-y bg-transparent text-base leading-7 placeholder:text-[#8b97aa] focus:outline-none" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {selectedTask !== null ? (
            <button onClick={() => setSelectedTask(null)} className="flex min-h-11 items-center gap-2 rounded-lg bg-[#edf3ff] px-3 text-sm font-bold text-[#084ad4]">
              {t.presets[selectedTask].label}<X size={16} />
            </button>
          ) : <span />}
          <button onClick={onRun} className="flex min-h-12 items-center gap-2 rounded-xl bg-[#1261ff] px-6 font-bold text-white hover:bg-[#084ad4] focus:ring-4 focus:ring-[#1261ff]/20">
            <PaperPlaneTilt size={21} weight="bold" aria-hidden /> {t.start}
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-7">
        {t.categories.map((category, categoryIndex) => (
          <section key={category.title}>
            <div className="mb-4">
              <h2 className="text-xl font-bold">{category.title}</h2>
              <p className="mt-1 text-sm text-[#60708f]">{category.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {t.presets.slice(categoryIndex * 4, categoryIndex * 4 + 4).map((preset, localIndex) => {
                const index = categoryIndex * 4 + localIndex;
                const Icon = taskIcons[index];
                const selected = selectedTask === index;
                return (
                  <button key={preset.label} onClick={() => setSelectedTask(index)} aria-pressed={selected} className={`min-h-24 rounded-2xl border p-4 text-left transition-colors ${selected ? "border-[#1261ff] bg-[#edf3ff]" : "border-[#d9dee7] bg-white hover:border-[#9bbaff] hover:bg-[#f8faff]"}`}>
                    <div className="flex items-start gap-3">
                      <Icon size={27} className="shrink-0 text-[#1261ff]" aria-hidden />
                      <div><h3 className="font-bold">{preset.label}</h3><p className="mt-1 text-sm leading-5 text-[#60708f]">{preset.description}</p></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ConversationView({ t, submittedInput, output, requestError, loading, activeTaskLabel, userInput, setUserInput, onRun, onStop, onEdit, copied, onCopy, feedback, setFeedback, selectedTask, setSelectedTask }: {
  t: CopyText;
  submittedInput: string;
  output: string;
  requestError: boolean;
  loading: boolean;
  activeTaskLabel: string;
  userInput: string;
  setUserInput: (text: string) => void;
  onRun: () => void;
  onStop: () => void;
  onEdit: () => void;
  copied: boolean;
  onCopy: () => void;
  feedback: "up" | "down" | null;
  setFeedback: (value: "up" | "down" | null) => void;
  selectedTask: number | null;
  setSelectedTask: (index: number | null) => void;
}) {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="mx-auto mt-7 max-w-5xl">
      <p className="text-sm font-semibold text-[#60708f]">{t.newConversation} <span className="mx-2">/</span> <span className="text-[#10182b]">{activeTaskLabel}</span></p>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h1 className="text-xl font-bold">{t.yourRequest}</h1><button onClick={onEdit} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#1261ff] hover:bg-[#edf3ff]"><PencilSimple size={19} /> {t.edit}</button></div>
        <div className="rounded-2xl border border-[#d9dee7] bg-white p-5">
          <p className="text-sm font-bold text-[#1261ff]">{activeTaskLabel}</p>
          <p className="mt-3 line-clamp-4 whitespace-pre-wrap leading-7 text-[#40516f]">{submittedInput}</p>
        </div>
      </section>
      <section className="mt-8" aria-live="polite" aria-busy={loading}>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Sparkle size={26} className="text-[#1261ff]" weight="fill" /> {t.assistant}</h2>
        {loading ? (
          <div className="rounded-2xl border border-[#bcd0ff] bg-[#f4f7ff] p-7">
            <div className="flex items-center gap-4">
              <span className="h-8 w-8 animate-[spin_1.2s_linear_infinite] rounded-full border-2 border-[#bcd0ff] border-t-[#1261ff]" aria-hidden />
              <div><p className="text-xl font-bold">{t.preparing}</p><p className="mt-2 text-[#60708f]">{t.preparingNote}</p></div>
            </div>
          </div>
        ) : requestError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
            <p className="font-bold">{t.status.error}</p>
            <button onClick={onRun} className="mt-4 min-h-11 rounded-lg border border-red-300 bg-white px-4 text-sm font-bold hover:bg-red-100">
              {t.start}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#d9dee7] bg-white p-5 sm:p-7">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h3 className="mb-4 mt-2 text-2xl font-bold tracking-[-0.02em] text-[#10182b]">{children}</h3>,
                h2: ({ children }) => <h3 className="mb-3 mt-6 text-xl font-bold text-[#10182b]">{children}</h3>,
                h3: ({ children }) => <h4 className="mb-2 mt-5 text-lg font-bold text-[#10182b]">{children}</h4>,
                p: ({ children }) => <p className="my-3 leading-7 text-[#263653]">{children}</p>,
                ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-[#263653]">{children}</ul>,
                ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 text-[#263653]">{children}</ol>,
                li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
                strong: ({ children }) => <strong className="font-bold text-[#10182b]">{children}</strong>,
                hr: () => <hr className="my-6 border-[#e1e5ec]" />,
                blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-[#9bbaff] bg-[#f4f7ff] px-4 py-2 text-[#40516f]">{children}</blockquote>,
                table: ({ children }) => <div className="my-5 overflow-x-auto"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
                th: ({ children }) => <th className="border border-[#d9dee7] bg-[#f4f6f9] px-3 py-2 font-bold">{children}</th>,
                td: ({ children }) => <td className="border border-[#d9dee7] px-3 py-2 align-top">{children}</td>,
                code: ({ children }) => <code className="rounded bg-[#edf3ff] px-1.5 py-0.5 text-sm text-[#084ad4]">{children}</code>,
              }}
            >
              {output}
            </ReactMarkdown>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#e1e5ec] pt-4">
              <button onClick={onCopy} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#40516f] hover:bg-[#f4f6f9]"><Copy size={19} /> {copied ? t.copied : t.copy}</button>
              <span className="ml-auto text-sm text-[#60708f]">{t.useful}</span>
              <button onClick={() => setFeedback(feedback === "up" ? null : "up")} aria-pressed={feedback === "up"} aria-label="Útil" className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg ${feedback === "up" ? "bg-[#edf3ff] text-[#1261ff]" : "text-[#40516f] hover:bg-[#f4f6f9]"}`}><ThumbsUp size={20} /></button>
              <button onClick={() => setFeedback(feedback === "down" ? null : "down")} aria-pressed={feedback === "down"} aria-label="No útil" className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg ${feedback === "down" ? "bg-[#fff2f2] text-red-700" : "text-[#40516f] hover:bg-[#f4f6f9]"}`}><ThumbsDown size={20} /></button>
            </div>
          </div>
        )}
        {!loading && output && !requestError ? <p className="mt-3 text-sm text-[#60708f]">{t.generatedNote}</p> : null}
      </section>
      <div className="mt-8 rounded-2xl border border-[#d9dee7] bg-white p-4 focus-within:border-[#1261ff]">
        <textarea value={userInput} onChange={(event) => setUserInput(event.target.value)} disabled={loading} placeholder={t.inputPlaceholder} rows={3} className="w-full resize-y bg-transparent leading-7 placeholder:text-[#8b97aa] focus:outline-none disabled:opacity-60" />
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="relative">
            <button
              type="button"
              disabled={loading}
              onClick={() => setToolsOpen((open) => !open)}
              aria-expanded={toolsOpen}
              className="flex min-h-12 items-center gap-2 rounded-xl px-3 font-semibold text-[#40516f] hover:bg-[#f4f6f9] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Toolbox size={21} aria-hidden /> {t.tools}
            </button>
            {toolsOpen && !loading ? (
              <div className="absolute bottom-14 left-0 z-20 w-[min(560px,calc(100vw-3rem))] rounded-2xl border border-[#d9dee7] bg-white p-3 shadow-xl">
                <p className="px-2 pb-2 text-sm font-bold text-[#10182b]">{t.chooseTool}</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {t.presets.map((preset, index) => {
                    const Icon = taskIcons[index];
                    const selected = selectedTask === index;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setSelectedTask(index);
                          setToolsOpen(false);
                        }}
                        className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm ${selected ? "bg-[#edf3ff] font-bold text-[#084ad4]" : "text-[#40516f] hover:bg-[#f4f6f9]"}`}
                      >
                        <Icon size={19} className="shrink-0 text-[#1261ff]" aria-hidden />
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          {loading ? (
            <button onClick={onStop} className="flex min-h-12 items-center gap-2 rounded-xl border border-[#1261ff] px-5 font-bold text-[#1261ff] hover:bg-[#edf3ff]"><X size={19} /> {t.stop}</button>
          ) : (
            <button onClick={onRun} className="flex min-h-12 items-center gap-2 rounded-xl bg-[#1261ff] px-6 font-bold text-white hover:bg-[#084ad4]"><PaperPlaneTilt size={20} weight="bold" /> {t.start}</button>
          )}
        </div>
      </div>
    </div>
  );
}
