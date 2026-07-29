"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { loginI18n } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm space-y-8 rounded-xl bg-slate-800 p-8 shadow-lg">
        <div className="space-y-4">
          <div className="flex justify-center">
            <Image
              src="/favicon.png"
              alt="Logo"
              width={80}
              height={80}
              className="h-20 w-20 rounded-full"
              priority
            />
          </div>
          <h1 className="text-center text-3xl font-bold text-white">{t.title}</h1>
          <p className="text-center text-slate-400">{t.welcomeMessage}</p>
          <div className="flex justify-center">
            <select
              value={currentLang}
              onChange={(event) => setCurrentLang(event.target.value as "es" | "en")}
              className="cursor-pointer appearance-none rounded border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-white transition-colors hover:bg-slate-600"
              aria-label={t.languageLabel}
            >
              <option value="es">🇪🇸 Español</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              {t.emailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              disabled={loading}
              className="relative block w-full appearance-none rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              {t.passwordLabel}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={loading}
              className="relative block w-full appearance-none rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-900/30 py-2 text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? t.loading : t.loginButton}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">{t.accountHelp}</p>
      </div>
    </div>
  );
}
