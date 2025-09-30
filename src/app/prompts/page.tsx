import PromptsClient from "./PromptsPage";

type Props = { searchParams: { lang?: string } };

const ALLOWED = new Set(["es","en"]);

export default function Page({ searchParams }: Props) {
  const raw = (searchParams.lang ?? "en").toLowerCase();;
  const lang = ALLOWED.has(raw) ? (raw as "es"|"en") : "en";

  return (
    <PromptsClient
      initialLang={lang}
    />
  );
}
