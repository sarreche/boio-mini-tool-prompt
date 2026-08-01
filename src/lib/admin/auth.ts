import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "user" | "admin" | "root";
export type AdminContext = { userId: string; role: "admin" | "root"; suspended: boolean };

export const getAuthenticatedUserId = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
});

export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_admin_context", { p_actor_user_id: userId });
  if (error || !data || typeof data !== "object") return null;
  const context = data as unknown as AdminContext;
  return context.suspended ? null : context;
});

export async function requireAdmin(rootOnly = false) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect("/login");
  const context = await getAdminContext();
  if (!context || (rootOnly && context.role !== "root")) redirect("/prompts");
  return context;
}

export async function requireActiveUser() {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect("/login");
  const admin = createAdminClient();
  const { data } = await admin.rpc("get_user_access_status", { p_user_id: userId });
  if (data && typeof data === "object" && (data as { suspended?: boolean }).suspended) redirect("/login?reason=suspended");
  return userId;
}
