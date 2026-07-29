"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { changePassword } from "@/lib/auth";
import { accountI18n } from "@/lib/i18n";

export default function PasswordPage() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const t = accountI18n[lang];
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
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
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <section className="w-full max-w-md space-y-6 rounded-xl bg-slate-800 p-8 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
          <p className="mt-2 text-sm text-slate-400">{t.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-slate-300" htmlFor="password">
            {t.passwordLabel}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
          />

          <label className="block text-sm text-slate-300" htmlFor="confirmation">
            {t.confirmLabel}
          </label>
          <input
            id="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white"
          />

          {message && (
            <p className={isError ? "text-sm text-red-400" : "text-sm text-emerald-400"} role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t.saving : t.save}
          </button>
        </form>

        <Link className="block text-center text-sm text-blue-400 hover:underline" href={`/prompts?lang=${lang}`}>
          {t.back}
        </Link>
      </section>
    </main>
  );
}
