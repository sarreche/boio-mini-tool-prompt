import Image from "next/image";
import Link from "next/link";
import AdminNav from "./AdminNav";
import { requireAdmin } from "@/lib/admin/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await requireAdmin();
  return <div className="min-h-screen bg-[#f7f9fc] text-[#10182b]">
    <header className="border-b border-[#d9dee7] bg-white"><div className="mx-auto flex max-w-[1500px] items-center gap-3 px-5 py-4">
      <Image src="/prompt-toolkit-logo.png" alt="" width={42} height={42} priority />
      <div><p className="font-bold">Prompt Toolkit</p><p className="text-xs text-[#60708f]">Administración · {context.role}</p></div>
      <Link href="/prompts" className="ml-auto rounded-lg px-3 py-2 text-sm font-bold text-[#1261ff] hover:bg-[#edf3ff]">Volver a la app</Link>
    </div></header>
    <main className="mx-auto max-w-[1500px] px-5 py-6"><AdminNav root={context.role === "root"} /><div className="mt-6">{children}</div></main>
  </div>;
}
