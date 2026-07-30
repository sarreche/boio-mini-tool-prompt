import PromptsClient from "./PromptsPage";

type Props = { searchParams: Promise<{ lang?: string }> };

const ALLOWED = new Set(["es","en"]);

export default async function Page({ searchParams }: Props) {
  const { lang: requestedLang } = await searchParams;
  const raw = (requestedLang ?? "es").toLowerCase();
  const lang = ALLOWED.has(raw) ? (raw as "es"|"en") : "en";

  return (
    <PromptsClient
      initialLang={lang}
    />
  );
}
