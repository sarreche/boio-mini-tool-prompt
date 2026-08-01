import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/authenticated";
import type { Locale, ProductBootstrap, TaskCard } from "@/lib/product-types";

const PAGE_SIZE = 20;
type TranslationRow = { locale: string; name: string; description: string | null };
type CategoryQueryRow = { id: string; code: string; sort_order: number; task_category_translations: TranslationRow[] };
type TaskQueryRow = { id: string; code: string; is_premium: boolean; sort_order: number; category_id: string | null; task_translations: TranslationRow[] };

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const locale: Locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "es";
  const cursor = request.nextUrl.searchParams.get("cursor");
  const { supabase, userId } = auth;

  let conversationsQuery = supabase.from("conversations")
    .select("id,title,updated_at,initial_task_id")
    .eq("user_id", userId).is("archived_at", null)
    .order("updated_at", { ascending: false }).limit(PAGE_SIZE + 1);
  if (cursor) conversationsQuery = conversationsQuery.lt("updated_at", cursor);

  const now = new Date().toISOString();
  const [tasksResult, categoriesResult, conversationsResult, profileResult, subscriptionResult, freePlanResult, deletionResult, planEntitlementsResult, userEntitlementsResult] = await Promise.all([
    supabase.from("tasks").select("id,code,is_premium,sort_order,category_id,task_translations!inner(locale,name,description)").eq("is_active", true).eq("task_translations.locale", locale).order("sort_order"),
    supabase.from("task_categories").select("id,code,sort_order,task_category_translations!inner(locale,name,description)").eq("is_active", true).eq("task_category_translations.locale", locale).order("sort_order"),
    conversationsQuery,
    supabase.from("profiles").select("display_name,locale,timezone,analytics_content_opt_out").eq("id", userId).single(),
    supabase.from("subscriptions").select("plan_id,plan:plans(code,name)").eq("user_id", userId).eq("status", "active").or(`current_period_ends_at.is.null,current_period_ends_at.gt.${now}`).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("plans").select("id,code,name").eq("code", "free").eq("is_active", true).single(),
    supabase.from("account_deletion_requests").select("status,requested_at").in("status", ["requested", "in_progress"]).order("requested_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("plan_entitlements").select("plan_id,capability,value"),
    supabase.from("user_entitlements").select("capability,value,starts_at,expires_at").eq("user_id", userId).lte("starts_at", now).or(`expires_at.is.null,expires_at.gt.${now}`),
  ]);

  const firstError = [tasksResult, categoriesResult, conversationsResult, profileResult, subscriptionResult, freePlanResult, deletionResult, planEntitlementsResult, userEntitlementsResult].find((result) => result.error)?.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const categoryRows = (categoriesResult.data ?? []) as CategoryQueryRow[];
  const taskRows = (tasksResult.data ?? []) as TaskQueryRow[];
  const categories = new Map(categoryRows.map((category) => {
    const translation = category.task_category_translations[0];
    return [category.id, { code: category.code, name: translation.name, description: translation.description }];
  }));
  const tasks: TaskCard[] = taskRows.map((task) => {
    const translation = task.task_translations[0];
    const category = (task.category_id ? categories.get(task.category_id) : null) ?? { code: "other", name: locale === "es" ? "Otras" : "Other", description: null };
    return { id: task.id, code: task.code, name: translation.name, description: translation.description, categoryCode: category.code, categoryName: category.name, categoryDescription: category.description, isPremium: task.is_premium, sortOrder: task.sort_order };
  });
  const rawConversations = conversationsResult.data ?? [];
  const visibleConversations = rawConversations.slice(0, PAGE_SIZE);
  const subscriptionPlan = (subscriptionResult.data as { plan_id?: string; plan?: { code: string; name: string } | { code: string; name: string }[] } | null)?.plan;
  const effectivePlan = Array.isArray(subscriptionPlan) ? subscriptionPlan[0] : subscriptionPlan;
  const selectedPlan = effectivePlan ?? freePlanResult.data!;
  const entitlements = Object.fromEntries((planEntitlementsResult.data ?? []).filter((item) => item.plan_id === (subscriptionResult.data as { plan_id?: string } | null)?.plan_id || (!effectivePlan && item.plan_id === freePlanResult.data?.id)).map((item) => [item.capability, item.value]));
  for (const item of userEntitlementsResult.data ?? []) entitlements[item.capability] = item.value;
  const profile = profileResult.data!;
  const payload: ProductBootstrap = {
    tasks,
    conversations: visibleConversations.map((item) => ({ id: item.id, title: item.title, updatedAt: item.updated_at, initialTaskId: item.initial_task_id })),
    profile: { displayName: profile.display_name, locale: profile.locale as Locale, timezone: profile.timezone, analyticsContentOptOut: profile.analytics_content_opt_out },
    plan: { code: selectedPlan.code, name: selectedPlan.name, entitlements },
    deletionRequest: deletionResult.data ? { status: deletionResult.data.status, requestedAt: deletionResult.data.requested_at } : null,
    nextConversationCursor: rawConversations.length > PAGE_SIZE ? visibleConversations.at(-1)?.updated_at ?? null : null,
  };
  return NextResponse.json(payload);
}
