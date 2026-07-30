"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash, Globe, LockKey, PaperPlaneTilt, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { signIn } from "@/lib/auth";
import { loginI18n } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState<"es" | "en">("es");
  const t = loginI18n[currentLang];

  useEffect(() => {
    const browserLangs = navigator.languages || [navigator.language];
    const supportedLangs = Object.keys(loginI18n);
    const defaultLang = browserLangs
      .map((lang) => lang.split("-")[0])
      .find((lang) => supportedLangs.includes(lang)) as "es" | "en" | undefined;
    setCurrentLang(defaultLang || "es");
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: authError } = await signIn(email.trim(), password);

    if (authError) {
      console.error("Supabase login failed:", authError.code);
      setError(t.errorCredentials);
      setLoading(false);
      return;
    }

    router.replace(`/prompts?lang=${currentLang}`);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen bg-[#fbfbf9] lg:grid-cols-[minmax(420px,0.9fr)_1.1fr]">
      <section className="relative hidden overflow-hidden border-r border-[#e1e5ec] bg-[#f7f7f4] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <Brand />
        <div className="max-w-[520px] py-12">
          <Sparkle size={34} weight="fill" className="mb-5 text-[#f5b700]" aria-hidden />
          <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.04em] text-[#10182b] xl:text-6xl">{t.heroTitle}</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#526383]">{t.heroDescription}</p>
        </div>
        <div className="flex max-w-md items-center gap-4 text-[#1261ff]" aria-hidden>
          <span className="h-px flex-1 bg-[#cddcff]" />
          <Image src="/prompt-toolkit-logo.png" alt="" width={112} height={112} />
          <span className="h-px flex-1 bg-[#cddcff]" />
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden"><Brand /></div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#40516f]">
            <Globe size={20} aria-hidden />
            <span className="sr-only">{t.languageLabel}</span>
            <select value={currentLang} onChange={(event) => setCurrentLang(event.target.value as "es" | "en")} className="min-h-11 rounded-lg border border-transparent bg-transparent px-2 focus:border-[#1261ff]" aria-label={t.languageLabel}>
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-12">
          <h2 className="text-4xl font-bold tracking-[-0.035em] text-[#10182b] sm:text-5xl">{t.formTitle}</h2>
          <p className="mt-3 text-lg text-[#60708f]">{t.formDescription}</p>
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-base font-semibold text-[#10182b]">{t.emailLabel}</label>
              <input id="email" name="email" type="email" autoComplete="email" required autoFocus disabled={loading} className="min-h-14 w-full rounded-xl border border-[#cfd6e1] bg-white px-4 text-base text-[#10182b] placeholder:text-[#8b97aa] focus:border-[#1261ff] focus:outline-none focus:ring-4 focus:ring-[#1261ff]/10 disabled:opacity-60" placeholder={t.emailPlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-base font-semibold text-[#10182b]">{t.passwordLabel}</label>
              <div className="relative">
                <LockKey size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1261ff]" aria-hidden />
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={loading} className="min-h-14 w-full rounded-xl border border-[#cfd6e1] bg-white py-3 pl-12 pr-14 text-base text-[#10182b] placeholder:text-[#8b97aa] focus:border-[#1261ff] focus:outline-none focus:ring-4 focus:ring-[#1261ff]/10 disabled:opacity-60" placeholder={t.passwordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#40516f] hover:bg-[#f0f4fb]" aria-label={showPassword ? t.hidePassword : t.showPassword}>
                  {showPassword ? <EyeSlash size={23} /> : <Eye size={23} />}
                </button>
              </div>
            </div>
            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}
            <button type="submit" disabled={loading} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1261ff] px-5 text-base font-bold text-white transition-colors hover:bg-[#084ad4] focus:outline-none focus:ring-4 focus:ring-[#1261ff]/25 disabled:cursor-wait disabled:opacity-60">
              <PaperPlaneTilt size={22} weight="bold" aria-hidden />
              {loading ? t.loading : t.loginButton}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[#60708f]">
            {t.accountHelp}{" "}
            <Link href={`/contact?lang=${currentLang}`} className="font-bold text-[#1261ff] underline-offset-4 hover:underline">
              {t.accountHelpAction}
            </Link>
          </p>
          <div className="mt-8 flex items-center gap-3 border-t border-[#e1e5ec] pt-6 text-sm text-[#60708f]">
            <ShieldCheck size={23} className="shrink-0 text-[#1261ff]" aria-hidden />
            <span>{t.securityNote}</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 text-[#10182b]">
      <Image src="/prompt-toolkit-logo.png" alt="" width={52} height={52} priority />
      <span className="text-xl font-bold leading-5 tracking-[-0.02em]">Prompt<br />Toolkit</span>
    </div>
  );
}
