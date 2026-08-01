import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader, button, field } from "../ui";
import { grantPremiumTrials, savePlan, savePlanEntitlement, saveSubscription, saveUserEntitlement } from "../actions";

export default async function PlansAdminPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [plans, entitlements, subscriptions, tasks] = await Promise.all([
    admin.from("plans").select("*"),
    admin.from("plan_entitlements").select("*"),
    admin.from("subscriptions").select("id,user_id,plan_id,status,provider,current_period_ends_at").order("created_at", { ascending: false }).limit(200),
    admin.from("tasks").select("id,code").eq("is_premium", true),
  ]);
  return <>
    <PageHeader title="Planes y suscripciones" description="Capacidades configurables; configured=false mantiene usos mensuales ilimitados." />
    <form action={savePlan} className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-[#d9dee7] bg-white p-5"><input required name="code" className={field} placeholder="Código nuevo plan"/><input required name="name" className={field} placeholder="Nombre"/><input name="description" className={field} placeholder="Descripción"/><button className={button}>Crear plan</button></form>
    <div className="grid gap-4 lg:grid-cols-2">{plans.data?.map((plan) => <section key={plan.id} className="rounded-2xl border border-[#d9dee7] bg-white p-5"><h2 className="text-xl font-bold">{plan.name}</h2><p className="text-sm text-[#60708f]">{plan.description}</p><div className="mt-4 space-y-3">{entitlements.data?.filter((item) => item.plan_id === plan.id).map((item) => <form action={savePlanEntitlement} key={item.id} className="grid gap-2"><input type="hidden" name="planId" value={plan.id}/><input type="hidden" name="capability" value={item.capability}/><label className="text-sm font-bold">{item.capability}</label><div className="flex gap-2"><input name="value" className={`${field} flex-1 font-mono`} defaultValue={JSON.stringify(item.value)}/><button className={button}>Guardar</button></div></form>)}</div></section>)}</div>
    <section className="mt-6 rounded-2xl border border-[#d9dee7] bg-white p-5"><h2 className="text-xl font-bold">Nueva suscripción</h2><form action={saveSubscription} className="mt-3 flex flex-wrap gap-2"><input name="userId" required className={field} placeholder="UUID usuario"/><select name="planId" className={field}>{plans.data?.map((plan) => <option key={plan.id} value={plan.id}>{plan.code}</option>)}</select><select name="status" className={field}>{["pending","active","past_due","cancelled","expired"].map((status) => <option key={status}>{status}</option>)}</select><select name="provider" className={field}><option>manual</option><option>gumroad</option></select><input name="providerReference" className={field} placeholder="Referencia Gumroad"/><button className={button}>Crear</button></form>
      <h2 className="mt-6 text-xl font-bold">Suscripciones recientes</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Usuario</th><th>Plan</th><th>Estado</th><th>Proveedor</th><th>Fin</th></tr></thead><tbody>{subscriptions.data?.map((subscription) => <tr key={subscription.id} className="border-t"><td className="py-3 font-mono text-xs">{subscription.user_id}</td><td>{plans.data?.find((plan) => plan.id === subscription.plan_id)?.code}</td><td>{subscription.status}</td><td>{subscription.provider}</td><td>{subscription.current_period_ends_at ?? "—"}</td></tr>)}</tbody></table></div>
      <h2 className="mt-6 text-xl font-bold">Excepción por usuario</h2><form action={saveUserEntitlement} className="mt-3 flex flex-wrap gap-2"><input required name="userId" className={field} placeholder="UUID usuario"/><input required name="capability" className={field} placeholder="capability"/><input required name="value" className={field} placeholder='{"enabled":true}'/><input name="reason" className={field} placeholder="Motivo"/><button className={button}>Otorgar</button></form>
      <h2 className="mt-6 text-xl font-bold">Pruebas premium</h2><form action={grantPremiumTrials} className="mt-3 flex flex-wrap gap-2"><input required name="userId" className={field} placeholder="UUID usuario"/><select required name="taskId" className={field}>{tasks.data?.map((task) => <option key={task.id} value={task.id}>{task.code}</option>)}</select><input required min="1" type="number" name="quantity" className={`${field} w-24`} placeholder="Cantidad"/><input name="reason" className={field} placeholder="Motivo"/><button className={button}>Otorgar</button></form>
    </section>
  </>;
}
