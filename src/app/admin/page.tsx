import Link from "next/link";
import { getDashboard } from "@/lib/admin/data";
import { PageHeader, Card, field } from "./ui";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const requested = Number((await searchParams).days ?? 30);
  const days = [7, 30, 90].includes(requested) ? requested : 30;
  const data = await getDashboard(days);
  const modelStats = Object.entries(data.attempts.reduce<Record<string, { total: number; failed: number }>>((all, item) => {
    const key = `${item.provider_code}/${item.model_code}`; all[key] ??= { total: 0, failed: 0 }; all[key].total += 1; if (item.status === "failed") all[key].failed += 1; return all;
  }, {}));
  return <>
    <PageHeader title="Dashboard operativo" description="Métricas básicas de producto e inferencia, sin contenido de conversaciones." />
    <form className="mb-5 flex items-center gap-2"><label htmlFor="days" className="text-sm font-semibold">Período</label><select id="days" name="days" defaultValue={days} className={field}><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select><button className="rounded-lg px-3 py-2 text-sm font-bold text-[#1261ff]">Aplicar</button></form>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card label="Usuarios" value={data.users} /><Card label="Usuarios activos" value={data.activeUsers} /><Card label="Ejecuciones" value={data.executions} /><Card label="Usos" value={data.uses} /><Card label="Tasa de fallo" value={`${(data.failureRate * 100).toFixed(1)}%`} /><Card label="Latencia media" value={`${data.averageLatency} ms`} /><Card label="Tokens entrada/salida" value={`${data.inputTokens} / ${data.outputTokens}`} /><Card label="Pruebas premium" value={data.trialUses} /></div>
    <section className="mt-7"><h2 className="text-xl font-bold">Alertas</h2><div className="mt-3 grid gap-3 md:grid-cols-3">
      <Link href="/admin/requests" className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold">{data.pendingRequests} solicitudes pendientes</Link>
      <Link href="/admin/plans" className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold">{data.subscriptionAlerts} suscripciones vencidas/past due</Link>
      <Link href="/admin/settings" className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold">{data.pendingDeletions} borrados pendientes</Link>
    </div></section>
    <section className="mt-7 rounded-2xl border border-[#d9dee7] bg-white p-5"><h2 className="text-xl font-bold">Proveedor y modelo</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Modelo</th><th>Intentos</th><th>Fallos</th></tr></thead><tbody>{modelStats.map(([name, stat]) => <tr key={name} className="border-t border-[#e1e5ec]"><td className="py-3">{name}</td><td>{stat.total}</td><td>{stat.failed}</td></tr>)}</tbody></table></div></section>
  </>;
}
