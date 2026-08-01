import { requireAdmin } from "@/lib/admin/auth";
import { getPrivateData } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader,button,field } from "../ui";
import { saveSetting } from "../actions";

export default async function SettingsPage(){
 const context=await requireAdmin(true);const [settings,deletions]=await Promise.all([getPrivateData<Record<string,unknown>>(context,"settings"),createAdminClient().from("account_deletion_requests").select("id,user_id,status,requested_at,notes").in("status",["requested","in_progress","failed"]).order("requested_at")]);
 return <><PageHeader title="Configuración" description="Umbrales operativos y cola de borrado, exclusivamente para root."/><div className="space-y-3">{Object.entries(settings).map(([key,value])=><form action={saveSetting} key={key} className="rounded-2xl border border-[#d9dee7] bg-white p-5"><input type="hidden" name="key" value={key}/><label className="font-bold">{key}</label><div className="mt-3 flex gap-2"><input className={`${field} flex-1 font-mono`} name="value" defaultValue={JSON.stringify(value)}/><button className={button}>Guardar</button></div></form>)}</div><section className="mt-7"><h2 className="text-xl font-bold">Solicitudes de borrado</h2><p className="mt-1 text-sm text-[#60708f]">El procesamiento definitivo se realiza desde el usuario correspondiente y exige contraseña root y confirmación exacta.</p><div className="mt-3 space-y-2">{deletions.data?.map(item=><article key={item.id} className="rounded-xl border border-[#d9dee7] bg-white p-4"><p className="font-mono text-xs">{item.user_id}</p><p className="text-sm">{item.status} · {new Date(item.requested_at).toLocaleString("es-UY")}</p></article>)}{!deletions.data?.length?<p className="text-sm text-[#60708f]">No hay solicitudes pendientes.</p>:null}</div></section></>;
}
