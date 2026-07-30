import PlansPage from "./PlansPage";

type Props = { searchParams: Promise<{ lang?: string }> };

export default async function Page({ searchParams }: Props) {
  const { lang: requestedLang } = await searchParams;
  const lang = requestedLang === "en" ? "en" : "es";
  return <PlansPage initialLang={lang} />;
}
