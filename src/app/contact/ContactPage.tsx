"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  ChatCircleDots,
  Globe,
  PaperPlaneTilt,
  ShieldCheck,
  UserPlus,
} from "@phosphor-icons/react";
import { contactI18n } from "@/lib/i18n";
import {
  type ContactFormState,
  submitAccessRequest,
} from "./actions";

const initialContactFormState: ContactFormState = { status: "idle" };

export default function ContactPage({ initialLang }: { initialLang: "es" | "en" }) {
  const [lang, setLang] = useState<"es" | "en">(initialLang);
  const [requestType, setRequestType] = useState<"free_access" | "support">("free_access");
  const [state, action, pending] = useActionState(submitAccessRequest, initialContactFormState);
  const t = contactI18n[lang];

  if (state.status === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfbf9] px-5 py-12">
        <section className="w-full max-w-xl rounded-3xl border border-[#d9dee7] bg-white p-8 text-center shadow-[0_18px_60px_rgba(16,24,43,0.08)] sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf8ef] text-[#16834b]">
            <CheckCircle size={36} weight="fill" aria-hidden />
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-[-0.035em] text-[#10182b]">{t.successTitle}</h1>
          <p className="mt-3 leading-7 text-[#60708f]">{t.successDescription}</p>
          <Link href={`/login?lang=${lang}`} className="mt-8 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1261ff] px-5 font-bold text-white hover:bg-[#084ad4]">
            <ArrowLeft size={19} aria-hidden /> {t.back}
          </Link>
          <button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 px-4 font-bold text-[#40516f] hover:text-[#1261ff]">
            {t.sendAnother}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfbf9] text-[#10182b]">
      <header className="border-b border-[#e1e5ec] bg-white">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href={`/login?lang=${lang}`} className="flex items-center gap-3">
            <Image src="/prompt-toolkit-logo.png" alt="" width={46} height={46} priority />
            <span className="text-lg font-bold leading-5 tracking-[-0.02em]">Prompt<br />Toolkit</span>
          </Link>
          <label className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#40516f]">
            <Globe size={20} aria-hidden />
            <span className="sr-only">{t.language}</span>
            <select value={lang} onChange={(event) => setLang(event.target.value as "es" | "en")} className="bg-transparent" aria-label={t.language}>
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#1261ff]">{t.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{t.title}</h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-[#60708f]">{t.subtitle}</p>
          <div className="mt-8 flex max-w-md items-start gap-3 rounded-2xl border border-[#bcd0ff] bg-[#f4f7ff] p-5 text-sm leading-6 text-[#40516f]">
            <ShieldCheck size={24} className="mt-0.5 shrink-0 text-[#1261ff]" aria-hidden />
            <p>{t.privacy}</p>
          </div>
        </section>

        <form action={action} className="rounded-3xl border border-[#d9dee7] bg-white p-6 shadow-[0_18px_60px_rgba(16,24,43,0.06)] sm:p-8">
          <input type="hidden" name="locale" value={lang} />

          <fieldset>
            <legend className="text-base font-bold">{t.typeLabel}</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <RequestType
                active={requestType === "free_access"}
                icon={<UserPlus size={24} weight="duotone" />}
                title={t.freeType}
                description={t.freeDescription}
                onClick={() => setRequestType("free_access")}
              />
              <RequestType
                active={requestType === "support"}
                icon={<ChatCircleDots size={24} weight="duotone" />}
                title={t.supportType}
                description={t.supportDescription}
                onClick={() => setRequestType("support")}
              />
            </div>
            <input type="hidden" name="requestType" value={requestType} />
          </fieldset>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label={t.nameLabel} name="name" type="text" placeholder={t.namePlaceholder} autoComplete="name" />
            <Field label={t.emailLabel} name="email" type="email" placeholder={t.emailPlaceholder} autoComplete="email" />
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold">{t.messageLabel}</span>
            <textarea name="message" required minLength={10} maxLength={2000} rows={6} placeholder={requestType === "free_access" ? t.freeMessagePlaceholder : t.supportMessagePlaceholder} className="w-full resize-y rounded-xl border border-[#cfd6e1] bg-white px-4 py-3 text-base placeholder:text-[#8b97aa] focus:border-[#1261ff] focus:outline-none focus:ring-4 focus:ring-[#1261ff]/10" />
          </label>

          {state.status === "validation_error" || state.status === "server_error" ? (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {state.status === "validation_error" ? t.validationError : t.serverError}
            </p>
          ) : null}

          <button type="submit" disabled={pending} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1261ff] px-5 font-bold text-white hover:bg-[#084ad4] disabled:cursor-wait disabled:opacity-60">
            <PaperPlaneTilt size={22} weight="bold" aria-hidden />
            {pending ? t.submitting : t.submit}
          </button>
          <Link href={`/login?lang=${lang}`} className="mx-auto mt-3 flex min-h-11 w-fit items-center gap-2 px-4 font-bold text-[#40516f] hover:text-[#1261ff]">
            <ArrowLeft size={18} aria-hidden /> {t.back}
          </Link>
        </form>
      </div>
    </main>
  );
}

function RequestType({ active, icon, title, description, onClick }: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`min-h-32 rounded-2xl border p-4 text-left transition-colors ${active ? "border-[#1261ff] bg-[#f4f7ff] ring-2 ring-[#1261ff]/10" : "border-[#d9dee7] hover:border-[#9db9ff]"}`}>
      <span className={active ? "text-[#1261ff]" : "text-[#526383]"}>{icon}</span>
      <span className="mt-3 block font-bold">{title}</span>
      <span className="mt-1 block text-sm leading-5 text-[#60708f]">{description}</span>
    </button>
  );
}

function Field({ label, name, type, placeholder, autoComplete }: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input name={name} type={type} required minLength={name === "name" ? 2 : undefined} maxLength={name === "name" ? 120 : 320} placeholder={placeholder} autoComplete={autoComplete} className="min-h-12 w-full rounded-xl border border-[#cfd6e1] bg-white px-4 text-base placeholder:text-[#8b97aa] focus:border-[#1261ff] focus:outline-none focus:ring-4 focus:ring-[#1261ff]/10" />
    </label>
  );
}
