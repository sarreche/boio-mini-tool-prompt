"use client";

import { useEffect, useState } from "react";
import { promptsI18n } from "@/lib/i18n";
import PromptButton, { PromptPreset } from "@/components/PromptButtons";
import Image from "next/image";

export default function PromptsPage() {
  const [currentLang, setCurrentLang] = useState<"es" | "en">("es");
  const [userInput, setUserInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const t = promptsI18n[currentLang];

  // Detect language on mount
  useEffect(() => {
    const browserLangs = navigator.languages || [navigator.language];
    const supported = Object.keys(promptsI18n);
    const defaultLang = browserLangs
      .map((l) => l.split("-")[0])
      .find((l) => supported.includes(l));
    setCurrentLang((defaultLang as "es" | "en") || "es");
  }, []);

  const handleRun = async () => {
    if (!userInput.trim()) {
      alert(t.status.noInput);
      return;
    }
    setLoading(true);
    setOutput("");

    try {
      const res = await fetch("/api/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userInput,
          lang: currentLang,
          systemPrompt: t.systemPrompt,
        }),
      });

      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setOutput(data.text.trim());
    
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setOutput(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUserInput("");
    setOutput("");
  };

 const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    // Redirigir al login
    window.location.href = "/login";
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="Logo" width={48} height={48} className="w-12 h-12 rounded-full" />
      
          <h1 className="text-2xl font-bold">{t.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={currentLang}
            onChange={(e) => setCurrentLang(e.target.value as "es" | "en")}
            className="rounded bg-slate-700 px-2 py-1 text-sm text-white"
          >
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇬🇧 English</option>
          </select>
          <button
            onClick={handleLogout}
            className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700"
          >
            {currentLang === "es" ? "Salir" : "Logout"}
          </button>
        </div>
      </div>

      <p className="text-slate-400 mb-4">{t.subtitle}</p>

      {/* Card */}
      <div className="rounded-xl bg-slate-800 p-4 shadow">
        {/* Input */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">
            {t.userInput}
          </label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={t.userInputPlaceholder}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-white placeholder-slate-500"
            rows={5}
          />
        </div>

        {/* Presets */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">
            {t.buttonsLabel}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {t.presets.map((preset: PromptPreset, i: number) => (
                <PromptButton
                    key={i}
                    preset={preset}
                    currentText={userInput}
                    lang={currentLang}
                    onApply={(val:string) => setUserInput(val)}
    />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <button
            onClick={handleRun}
            disabled={loading}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400 disabled:opacity-50"
          >
            ▶ {t.execute}
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            {t.clear}
          </button>
        
        </div>

        {/* Output */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            {t.response}
          </label>
          <div className="min-h-[160px] whitespace-pre-wrap rounded-lg border border-slate-600 bg-slate-900 p-3 text-slate-100">
            {output}
          </div>
        </div>
      </div>
    </div>
  );
}
