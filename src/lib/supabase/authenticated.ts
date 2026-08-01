import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) return null;
  const { data: access } = await createAdminClient().rpc("get_user_access_status", { p_user_id: userId });
  if ((access as { suspended?: boolean } | null)?.suspended) return null;
  return { supabase, userId };
}
