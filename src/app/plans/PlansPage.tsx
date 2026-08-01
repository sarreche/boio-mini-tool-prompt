"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Crown,
  Globe,
  Info,
  Lightning,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { plansI18n } from "@/lib/i18n";

const GUMROAD_URL = "https://boiostore.gumroad.com/l/gqwnl";

export default function PlansPage({ initialLang }: { initialLang: "es" | "en" }) {
  const [lang, setLang] = useState<"es" | "en">(initialLang);
  const [currentPlan, setCurrentPlan] = useState("free");
  const t = plansI18n[lang];

  useEffect(() => {
    let active = true;
    fetch(`/api/app-data?locale=${lang}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => { if (active && value?.plan?.code) setCurrentPlan(value.plan.code); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [lang]);

  return (
    <main className="min-h-screen bg-[#fbfbf9] text-[#10182b]">
      <header className="border-b border-[#e1e5ec] bg-white">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href={`/prompts?lang=${lang}`} className="flex items-center gap-3 rounded-lg focus:ring-4 focus:ring-[#1261ff]/20">
            <Image src="/prompt-toolkit-logo.png" alt="" width={46} height={46} priority />
            <span className="text-lg font-bold leading-5 tracking-[-0.02em]">Prompt<br />Toolkit</span>
          </Link>
          <label className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#40516f] hover:bg-[#f4f6f9]">
            <Globe size={20} aria-hidden />
            <span className="sr-only">{t.language}</span>
            <select value={lang} onChange={(event) => setLang(event.target.value as "es" | "en")} className="bg-transparent" aria-label={t.language}>
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Sparkle size={34} weight="fill" className="mx-auto text-[#f5b700]" aria-hidden />
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-[#1261ff]">{t.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{t.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[#60708f]">{t.subtitle}</p>
        </div>

        <section className="mt-12 grid gap-5 lg:grid-cols-2" aria-label={t.comparisonLabel}>
          <PlanCard
            icon={<Lightning size={27} weight="duotone" />}
            name={t.free.name}
            description={t.free.description}
            badge={currentPlan === "free" ? t.current : t.free.name}
            features={t.free.features}
            action={<Link href={`/prompts?lang=${lang}`} className="flex min-h-12 items-center justify-center rounded-xl border border-[#cfd6e1] px-5 font-bold text-[#40516f] hover:bg-[#f4f6f9]">{t.keepUsing}</Link>}
          />
          <PlanCard
            featured
            icon={<Crown size={27} weight="duotone" />}
            name={t.paid.name}
            description={t.paid.description}
            badge={currentPlan === "paid" ? t.current : t.recommended}
            features={t.paid.features}
            action={
              <a href="#subscription-process" className="flex min-h-12 items-center justify-center rounded-xl bg-[#1261ff] px-5 font-bold text-white hover:bg-[#084ad4]">
                {t.howToSubscribe}
              </a>
            }
          />
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#bcd0ff] bg-[#f4f7ff] px-5 py-4 text-sm leading-6 text-[#40516f]">
          <Info size={23} className="mt-0.5 shrink-0 text-[#1261ff]" aria-hidden />
          <p><strong className="text-[#10182b]">{t.pendingTitle}</strong> {t.pendingDescription}</p>
        </div>

        <section id="subscription-process" className="mt-14 scroll-mt-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <ShieldCheck size={34} className="text-[#1261ff]" weight="duotone" aria-hidden />
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em]">{t.processTitle}</h2>
              <p className="mt-3 leading-7 text-[#60708f]">{t.processDescription}</p>
            </div>
            <ol className="space-y-3">
              {t.steps.map((step, index) => (
                <li key={step.title} className="flex gap-4 rounded-2xl border border-[#d9dee7] bg-white p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf3ff] font-bold text-[#1261ff]">{index + 1}</span>
                  <div><h3 className="font-bold">{step.title}</h3><p className="mt-1 text-sm leading-6 text-[#60708f]">{step.description}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-6 rounded-2xl border border-[#d9dee7] bg-white p-5 text-center sm:p-7">
            <h3 className="font-bold">{t.purchaseTitle}</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#60708f]">{t.purchaseDescription}</p>
            <a
              href={GUMROAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto mt-5 flex min-h-12 w-fit items-center justify-center rounded-xl bg-[#1261ff] px-6 font-bold text-white hover:bg-[#084ad4]"
            >
              {t.purchaseAction}
            </a>
          </div>
        </section>

        <Link href={`/prompts?lang=${lang}`} className="mx-auto mt-10 flex min-h-12 w-fit items-center gap-2 rounded-xl px-5 font-bold text-[#40516f] hover:bg-[#f0f4fb]">
          <ArrowLeft size={19} aria-hidden /> {t.back}
        </Link>
      </div>
    </main>
  );
}

function PlanCard({ icon, name, description, badge, features, action, featured = false }: {
  icon: React.ReactNode;
  name: string;
  description: string;
  badge: string;
  features: string[];
  action: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <article className={`flex flex-col rounded-2xl border bg-white p-6 sm:p-8 ${featured ? "border-[#1261ff] ring-4 ring-[#1261ff]/8" : "border-[#d9dee7]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${featured ? "bg-[#1261ff] text-white" : "bg-[#edf3ff] text-[#1261ff]"}`}>{icon}</div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${featured ? "bg-[#edf3ff] text-[#084ad4]" : "bg-[#f4f6f9] text-[#526383]"}`}>{badge}</span>
      </div>
      <h2 className="mt-6 text-3xl font-bold tracking-[-0.03em]">{name}</h2>
      <p className="mt-2 min-h-14 leading-7 text-[#60708f]">{description}</p>
      <ul className="my-7 space-y-3">
        {features.map((feature) => <li key={feature} className="flex gap-3 text-sm leading-6 text-[#40516f]"><Check size={20} weight="bold" className="mt-0.5 shrink-0 text-[#1261ff]" aria-hidden /> {feature}</li>)}
      </ul>
      <div className="mt-auto">{action}</div>
    </article>
  );
}
