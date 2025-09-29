"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { validateEmail, validatePin } from "@/lib/auth";
import { loginI18n } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"email" | "pin">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState<"es" | "en">("es");

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isValid = await validateEmail(email);
      if (isValid) {
        setStep("pin");
      } else {
        setError(t.errorEmailInvalid);
      }
    } catch (_err: unknown) {
      const msg = _err instanceof Error ? _err.message : String(_err);
      console.error("login error:", msg);
      setError(t.errorGeneral);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isValid = await validatePin(email, pin);
      if (isValid) {
        router.push("/"); 
      } else {
        setError(t.errorPinInvalid);
      }
    } catch (_err: unknown) {
      const msg = _err instanceof Error ? _err.message : String(_err);
      console.error("login error:", msg);
      setError(t.errorGeneral);
    } finally {
      setLoading(false);
    }
  };

  // Detect language on mount
  useEffect(() => {
    const browserLangs = navigator.languages || [navigator.language];
    const supportedLangs = Object.keys(loginI18n);
    const defaultLang = browserLangs
      .map((lang) => lang.split("-")[0])
      .find((lang) => supportedLangs.includes(lang)) as "es" | "en";

    setCurrentLang(defaultLang || "es");
  }, []);

  const t = loginI18n[currentLang];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm space-y-8 rounded-xl bg-slate-800 p-8 shadow-lg">
        {/* Logo + heading */}
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
          <h2 className="text-center text-3xl font-bold text-white">{t.title}</h2>
          <p className="text-center text-slate-400">{t.welcomeMessage}</p>
          <div className="flex justify-center">
            <select
              value={currentLang}
              onChange={(e) => setCurrentLang(e.target.value as "es" | "en")}
              className="cursor-pointer appearance-none rounded border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-white transition-colors hover:bg-slate-600"
            >
              <option value="es">🇪🇸 Español</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>

        {/* Step forms */}
        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="sr-only">
                {t.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                disabled={loading}
                className="relative block w-full appearance-none rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-900/30 py-1 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
              >
                {loading ? t.loading : t.continueButton}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePinSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="pin" className="sr-only">
                {t.pinLabel}
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                required
                autoFocus
                disabled={loading}
                className="relative block w-full appearance-none rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                placeholder={t.pinPlaceholder}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-900/30 py-1 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
              >
                {loading ? t.loading : t.loginButton}
              </button>

              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                {t.backButton}
              </button>
            </div>
          </form>
        )}

        {/* Signup link */}
        <p className="text-center text-slate-400" id="signupText">
          {t.signupPrefix}{" "}
          <a
            href="https://boiostore.gumroad.com/l/gqwnl"
            id="signupLink"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-medium text-blue-600 hover:underline"
          >
            {t.signupLink}
          </a>
        </p>
      </div>
    </div>
  );
}
