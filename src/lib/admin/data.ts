import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminContext } from "./auth";

export async function getPrivateData<T>(context: AdminContext, kind: string): Promise<T> {
  const { data, error } = await createAdminClient().rpc("get_admin_private_data", {
    p_actor_user_id: context.userId,
    p_kind: kind,
  });
  if (error) throw new Error(error.message);
  return data as T;
}

export async function getDashboard(context: AdminContext, days: number, customStart?: string, customEnd?: string) {
  const admin = createAdminClient();
  const since = customStart ? new Date(customStart).toISOString() : new Date(Date.now() - days * 86_400_000).toISOString();
  const until = customEnd ? new Date(`${customEnd}T23:59:59.999Z`).toISOString() : new Date().toISOString();
  const [users, executions, attempts, usage, requests, deletions, subscriptions, ratings, trials, settings, anonymous] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    admin.from("executions").select("id,status,user_id,task_id,created_at", { count: "exact" }).gte("created_at", since).lte("created_at", until),
    admin.from("execution_attempts").select("status,provider_code,model_code,input_tokens,output_tokens,latency_ms,created_at").gte("created_at", since).lte("created_at", until),
    admin.from("usage_events").select("units,plan_id,billable,occurred_at").gte("occurred_at", since).lte("occurred_at", until),
    admin.from("access_requests").select("id,status,created_at").eq("status", "pending"),
    admin.from("account_deletion_requests").select("id,status").in("status", ["requested", "in_progress"]),
    admin.from("subscriptions").select("id,status").in("status", ["past_due", "expired"]),
    admin.from("ratings").select("is_helpful").gte("created_at", since).lte("created_at", until),
    admin.from("premium_trial_usages").select("id", { count: "exact", head: true }).gte("used_at", since),
    getPrivateData<Record<string,{rate?:number;minimum_attempts?:number;age_hours?:number}>>(context,"settings"),
    admin.rpc("get_anonymous_dashboard_metrics",{p_actor_user_id:context.userId,p_start:since.slice(0,10),p_end:until.slice(0,10)}),
  ]);
  const succeeded = attempts.data?.filter((item) => item.status === "succeeded").length ?? 0;
  const failed = attempts.data?.filter((item) => item.status === "failed").length ?? 0;
  const totalAttempts = succeeded + failed;
  const failureSetting=settings["alerts.model_failure"]??{rate:.1,minimum_attempts:20};
  const requestSetting=settings["alerts.pending_request"]??{age_hours:24};
  return {
    days,
    users: (users.data as { total?: number } | null)?.total ?? users.data?.users.length ?? 0,
    activeUsers: new Set(executions.data?.map((item) => item.user_id)).size,
    executions: executions.count ?? executions.data?.length ?? 0,
    uses: (usage.data?.reduce((sum, item) => sum + item.units, 0) ?? 0)+Number(anonymous.data?.uses??0),
    succeeded,
    failed,
    failureRate: totalAttempts ? failed / totalAttempts : 0,
    inputTokens: attempts.data?.reduce((sum, item) => sum + (item.input_tokens ?? 0), 0) ?? 0,
    outputTokens: attempts.data?.reduce((sum, item) => sum + (item.output_tokens ?? 0), 0) ?? 0,
    averageLatency: Math.round((attempts.data?.reduce((sum, item) => sum + (item.latency_ms ?? 0), 0) ?? 0) / Math.max(totalAttempts, 1)),
    pendingRequests: requests.data?.length ?? 0,
    pendingDeletions: deletions.data?.length ?? 0,
    subscriptionAlerts: subscriptions.data?.length ?? 0,
    helpful: ratings.data?.filter((item) => item.is_helpful).length ?? 0,
    unhelpful: ratings.data?.filter((item) => !item.is_helpful).length ?? 0,
    trialUses: trials.count ?? 0,
    attempts: attempts.data ?? [],
    modelAlertActive: totalAttempts>=(failureSetting.minimum_attempts??20)&&failed/Math.max(totalAttempts,1)>(failureSetting.rate??.1),
    staleRequests: (requests.data??[]).filter(item=>Date.now()-new Date(item.created_at).getTime()>(requestSetting.age_hours??24)*3_600_000).length,
    taskUses:Object.entries((executions.data??[]).reduce<Record<string,number>>((all,item)=>{const key=item.task_id??"chat";all[key]=(all[key]??0)+1;return all},{})),
    planUses:Object.entries((usage.data??[]).reduce<Record<string,number>>((all,item)=>{const key=item.plan_id??"sin-plan";all[key]=(all[key]??0)+item.units;return all},{})),
  };
}
