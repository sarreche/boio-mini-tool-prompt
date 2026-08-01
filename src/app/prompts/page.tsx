import PromptsClient from "./PromptsPage";
import { getAdminContext, requireActiveUser } from "@/lib/admin/auth";

type Props = { searchParams: Promise<{ lang?: string }> };

const ALLOWED = new Set(["es","en"]);

export default async function Page({ searchParams }: Props) {
  await requireActiveUser();
  const { lang: requestedLang } = await searchParams;
  const raw = (requestedLang ?? "es").toLowerCase();
  const lang = ALLOWED.has(raw) ? (raw as "es"|"en") : "en";

  const adminContext = await getAdminContext();
  return <PromptsClient initialLang={lang} adminRole={adminContext?.role ?? null} />;
}
