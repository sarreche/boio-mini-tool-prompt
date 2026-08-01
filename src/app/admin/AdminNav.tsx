"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["/admin", "Dashboard"], ["/admin/users", "Usuarios"], ["/admin/requests", "Solicitudes"],
  ["/admin/plans", "Planes"], ["/admin/catalog", "Catálogo"], ["/admin/models", "Modelos"],
  ["/admin/audit", "Auditoría"], ["/admin/conversations", "Conversaciones"], ["/admin/settings", "Configuración"],
] as const;

export default function AdminNav({ root }: { root: boolean }) {
  const pathname = usePathname();
  return <nav className="flex gap-2 overflow-x-auto border-b border-[#d9dee7] pb-3" aria-label="Administración">
    {items.filter(([href]) => root || !["/admin/conversations", "/admin/settings"].includes(href)).map(([href, label]) => (
      <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${pathname === href ? "bg-[#1261ff] text-white" : "text-[#40516f] hover:bg-[#edf3ff]"}`}>{label}</Link>
    ))}
  </nav>;
}
