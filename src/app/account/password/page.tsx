"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeSlash,
  Globe,
  LockKey,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { changePassword } from "@/lib/auth";
import { accountI18n } from "@/lib/i18n";

export default function PasswordPage() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const t = accountI18n[lang];
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestedLang = new URLSearchParams(window.location.search).get("lang");
    setLang(requestedLang === "en" ? "en" : "es");
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (password.length < 8) {
      setMessage(t.tooShort);
      setIsError(true);
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setMessage(t.requirements);
      setIsError(true);
      return;
    }
    if (password !== confirmation) {
      setMessage(t.mismatch);
      setIsError(true);
      return;
    }

    setLoading(true);
    const { error } = await changePassword(password);
    setLoading(false);

    if (error) {
      console.error("Supabase password update failed:", error.code);
      setMessage(t.error);
      setIsError(true);
      return;
    }

    setPassword("");
    setConfirmation("");
    setMessage(t.success);
  }

  return (
    <main className="min-h-screen bg-[#fbfbf9]">
      <header className="border-b border-[#e1e5ec] bg-white">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href={`/prompts?lang=${lang}`} className="flex items-center gap-3 rounded-lg focus:ring-4 focus:ring-[#1261ff]/20">
            <Image src="/prompt-toolkit-logo.png" alt="" width={46} height={46} priority />
            <span className="text-lg font-bold leading-5 tracking-[-0.02em]">Prompt<br />Toolkit</span>
          </Link>
          <label className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#40516f] hover:bg-[#f4f6f9]">
            <Globe size={20} aria-hidden />
            <span className="sr-only">{lang === "es" ? "Idioma" : "Language"}</span>
            <select value={lang} onChange={(event) => setLang(event.target.value as "es" | "en")} className="bg-transparent" aria-label={lang === "es" ? "Idioma" : "Language"}>
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
        <section className="lg:pt-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf3ff] text-[#1261ff]">
            <ShieldCheck size={31} weight="duotone" aria-hidden />
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-[-0.04em] text-[#10182b] sm:text-5xl">{t.title}</h1>
          <p className="mt-4 max-w-md text-lg leading-8 text-[#60708f]">{t.description}</p>
          <div className="mt-8 rounded-2xl border border-[#d9dee7] bg-white p-5 text-sm leading-6 text-[#526383]">
            <p className="font-bold text-[#10182b]">{t.securityTitle}</p>
            <p className="mt-2">{t.securityDescription}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#d9dee7] bg-white p-5 sm:p-8 lg:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <PasswordField
              id="password"
              label={t.passwordLabel}
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
              showLabel={t.showPassword}
              hideLabel={t.hidePassword}
            />
            <PasswordField
              id="confirmation"
              label={t.confirmLabel}
              value={confirmation}
              onChange={setConfirmation}
              visible={showConfirmation}
              onToggle={() => setShowConfirmation((visible) => !visible)}
              showLabel={t.showPassword}
              hideLabel={t.hidePassword}
            />

            <div className="rounded-xl bg-[#f4f7ff] px-4 py-3 text-sm leading-6 text-[#40516f]">
              {t.requirementsHint}
            </div>

            {message ? (
              <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${isError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status">
                {isError ? <WarningCircle size={21} className="shrink-0" /> : <CheckCircle size={21} className="shrink-0" />}
                <span>{message}</span>
              </div>
            ) : null}

            <button type="submit" disabled={loading} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1261ff] px-5 font-bold text-white hover:bg-[#084ad4] focus:ring-4 focus:ring-[#1261ff]/20 disabled:cursor-wait disabled:opacity-60">
              <LockKey size={21} weight="bold" aria-hidden />
              {loading ? t.saving : t.save}
            </button>
          </form>

          <Link className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl font-semibold text-[#40516f] hover:bg-[#f4f6f9]" href={`/prompts?lang=${lang}`}>
            <ArrowLeft size={19} aria-hidden /> {t.back}
          </Link>
        </section>
      </div>
    </main>
  );
}

function PasswordField({ id, label, value, onChange, visible, onToggle, showLabel, hideLabel }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-base font-semibold text-[#10182b]" htmlFor={id}>{label}</label>
      <div className="relative">
        <LockKey size={21} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1261ff]" aria-hidden />
        <input id={id} type={visible ? "text" : "password"} autoComplete="new-password" required minLength={8} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-14 w-full rounded-xl border border-[#cfd6e1] bg-white py-3 pl-12 pr-14 text-[#10182b] focus:border-[#1261ff] focus:outline-none focus:ring-4 focus:ring-[#1261ff]/10" />
        <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#40516f] hover:bg-[#f0f4fb]" aria-label={visible ? hideLabel : showLabel}>
          {visible ? <EyeSlash size={22} /> : <Eye size={22} />}
        </button>
      </div>
    </div>
  );
}
