"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { requestAuditContext, writeAudit } from "@/lib/admin/audit";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function generateInviteLink(form: FormData) {
  const context = await requireAdmin();
  const email = text(form, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Correo inválido");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email });
  await writeAudit({ actorUserId: context.userId, action: "user.invite.generate", resourceType: "user", result: error ? "failure" : "success", after: { emailDomain: email.split("@")[1] } });
  if (error) throw new Error(error.message);
  return { link: data.properties.action_link };
}

export async function updateUserAccess(form: FormData) {
  const context = await requireAdmin();
  const request = await requestAuditContext();
  const { error } = await createAdminClient().rpc("set_user_access", {
    p_actor_user_id: context.userId,
    p_target_user_id: text(form, "userId"),
    p_suspended: text(form, "suspended") === "true",
    p_reason: text(form, "reason"),
    ...request,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function updateUserRole(form: FormData) {
  const context = await requireAdmin(true);
  const request = await requestAuditContext();
  const { error } = await createAdminClient().rpc("set_user_role", {
    p_actor_user_id: context.userId,
    p_target_user_id: text(form, "userId"),
    p_role: text(form, "role"),
    ...request,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function updateProfile(form: FormData) {
  const context = await requireAdmin(); const id=text(form,"userId"); const admin=createAdminClient();
  const {data:before}=await admin.from("profiles").select("display_name,locale,timezone").eq("id",id).single();
  const after={display_name:text(form,"displayName")||null,locale:text(form,"locale"),timezone:text(form,"timezone")||"America/Montevideo"};
  const {error}=await admin.from("profiles").update(after).eq("id",id); await writeAudit({actorUserId:context.userId,action:"user.profile.update",resourceType:"user",resourceId:id,result:error?"failure":"success",before,after}); if(error)throw new Error(error.message);revalidatePath("/admin/users");
}

export async function updateRequest(form: FormData) {
  const context = await requireAdmin();
  const id = text(form, "id");
  const admin = createAdminClient();
  const { data: before } = await admin.from("access_requests").select("status,resolution_note").eq("id", id).single();
  const after = { status: text(form, "status"), resolution_note: text(form, "resolutionNote") || null, reviewed_by: context.userId, reviewed_at: new Date().toISOString() };
  const { error } = await admin.from("access_requests").update(after).eq("id", id);
  await writeAudit({ actorUserId: context.userId, action: "access_request.update", resourceType: "access_request", resourceId: id, result: error ? "failure" : "success", before, after });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/requests");
}

export async function savePlanEntitlement(form: FormData) {
  const context = await requireAdmin();
  const planId = text(form, "planId");
  const capability = text(form, "capability");
  let value: unknown;
  try { value = JSON.parse(text(form, "value")); } catch { throw new Error("El valor debe ser JSON válido"); }
  const admin = createAdminClient();
  const { data: before } = await admin.from("plan_entitlements").select("value").eq("plan_id", planId).eq("capability", capability).maybeSingle();
  const { error } = await admin.from("plan_entitlements").upsert({ plan_id: planId, capability, value }, { onConflict: "plan_id,capability" });
  await writeAudit({ actorUserId: context.userId, action: "plan.entitlement.update", resourceType: "plan", resourceId: planId, result: error ? "failure" : "success", before, after: { capability, value } });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plans");
}

export async function saveSubscription(form:FormData){const context=await requireAdmin();const admin=createAdminClient();const id=text(form,"id");const values={user_id:text(form,"userId"),plan_id:text(form,"planId"),status:text(form,"status"),provider:text(form,"provider")||"manual",provider_subscription_id:text(form,"providerReference")||null,purchaser_email:text(form,"purchaserEmail")||null,starts_at:text(form,"startsAt")||null,current_period_ends_at:text(form,"endsAt")||null};const query=id?admin.from("subscriptions").update(values).eq("id",id).select("id").single():admin.from("subscriptions").insert(values).select("id").single();const{data,error}=await query;await writeAudit({actorUserId:context.userId,action:id?"subscription.update":"subscription.create",resourceType:"subscription",resourceId:id||data?.id,result:error?"failure":"success",after:{...values,purchaser_email:values.purchaser_email?"[redacted]":null}});if(error)throw new Error(error.message);revalidatePath("/admin/plans");}

export async function saveUserEntitlement(form:FormData){const context=await requireAdmin();let value:unknown;try{value=JSON.parse(text(form,"value"));}catch{throw new Error("JSON inválido");}const admin=createAdminClient();const row={user_id:text(form,"userId"),capability:text(form,"capability"),value,reason:text(form,"reason")||null,expires_at:text(form,"expiresAt")||null};const{data,error}=await admin.from("user_entitlements").insert(row).select("id").single();await writeAudit({actorUserId:context.userId,action:"user.entitlement.create",resourceType:"user_entitlement",resourceId:data?.id,result:error?"failure":"success",after:row});if(error)throw new Error(error.message);revalidatePath("/admin/plans");}

export async function saveTask(form: FormData) {
  const context = await requireAdmin();
  const id = text(form, "id");
  const admin = createAdminClient();
  const next = { is_active: text(form, "isActive") === "true", is_premium: text(form, "isPremium") === "true", sort_order: Number(text(form, "sortOrder")) || 0 };
  const { data: before } = await admin.from("tasks").select("is_active,is_premium,sort_order").eq("id", id).single();
  const { error } = await admin.from("tasks").update(next).eq("id", id);
  await writeAudit({ actorUserId: context.userId, action: "task.update", resourceType: "task", resourceId: id, result: error ? "failure" : "success", before, after: next });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/catalog"); revalidatePath("/prompts");
}

export async function saveTaskTranslation(form:FormData){const context=await requireAdmin();const taskId=text(form,"taskId");const locale=text(form,"locale");const admin=createAdminClient();const values={task_id:taskId,locale,name:text(form,"name"),description:text(form,"description")||null,user_prompt_template:text(form,"promptTemplate"),system_prompt:text(form,"systemPrompt")};const{error}=await admin.from("task_translations").upsert(values,{onConflict:"task_id,locale"});await writeAudit({actorUserId:context.userId,action:"task.translation.update",resourceType:"task",resourceId:taskId,result:error?"failure":"success",after:{locale,name:values.name,description:values.description,promptChanged:true,systemPromptChanged:true}});if(error)throw new Error(error.message);revalidatePath("/admin/catalog");revalidatePath("/prompts");}

export async function saveModelRoute(form: FormData) {
  const context = await requireAdmin();
  const id = text(form, "id");
  const active = text(form, "isActive") === "true";
  const request = await requestAuditContext();
  const { error } = await createAdminClient().rpc("update_model_route", { p_actor_user_id: context.userId, p_rule_id: id, p_active: active, p_priority: Number(text(form, "priority")) || 0, ...request });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/models");
}

export async function saveSetting(form: FormData) {
  const context = await requireAdmin(true); let value: unknown;
  try { value = JSON.parse(text(form, "value")); } catch { throw new Error("JSON inválido"); }
  const request = await requestAuditContext();
  const { error } = await createAdminClient().rpc("update_operational_setting", { p_actor_user_id: context.userId, p_key: text(form, "key"), p_value: value, ...request });
  if (error) throw new Error(error.message); revalidatePath("/admin/settings");
}

export async function deleteUserPermanently(form: FormData) {
  const context = await requireAdmin(true); const targetId = text(form, "userId"); const confirmation = text(form, "confirmation"); const password = text(form, "password");
  if (!password || targetId === context.userId) throw new Error("Operación no permitida");
  const admin = createAdminClient(); const { data: actor } = await admin.auth.admin.getUserById(context.userId); const { data: target } = await admin.auth.admin.getUserById(targetId);
  if (!actor.user?.email || !target.user?.email || confirmation.toLowerCase() !== target.user.email.toLowerCase()) throw new Error("La confirmación no coincide");
  const sessionClient = await import("@/lib/supabase/server").then((module) => module.createClient()); const { error: authError } = await sessionClient.auth.signInWithPassword({ email: actor.user.email, password });
  if (authError) { await writeAudit({ actorUserId: context.userId, action: "user.delete", resourceType: "user", result: "denied" }); throw new Error("Reautenticación fallida"); }
  const consolidated = await admin.rpc("consolidate_user_metrics_for_deletion", { p_actor_user_id: context.userId, p_target_user_id: targetId }); if (consolidated.error) throw new Error(consolidated.error.message);
  const { error } = await admin.auth.admin.deleteUser(targetId); await writeAudit({ actorUserId: context.userId, action: "user.delete", resourceType: "user", result: error ? "failure" : "success", after: { anonymousMetricsPreserved: true } });
  if (error) throw new Error(error.message); revalidatePath("/admin/users");
}

export async function logConversationRead(conversationId: string) {
  const context = await requireAdmin(true);
  await writeAudit({ actorUserId: context.userId, action: "conversation.read", resourceType: "conversation", resourceId: conversationId });
}
