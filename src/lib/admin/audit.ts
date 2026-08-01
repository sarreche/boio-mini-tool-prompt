import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requestAuditContext() {
  const values = await headers();
  const forwarded = values.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return {
    p_request_id: values.get("x-request-id") ?? crypto.randomUUID(),
    p_ip: forwarded,
    p_user_agent: values.get("user-agent")?.slice(0, 500) ?? null,
  };
}

export async function writeAudit(input: {
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  result?: "success" | "failure" | "denied";
  before?: unknown;
  after?: unknown;
}) {
  const admin = createAdminClient();
  const request = await requestAuditContext();
  const { error } = await admin.rpc("write_admin_audit", {
    p_actor_user_id: input.actorUserId,
    p_action: input.action,
    p_resource_type: input.resourceType,
    p_resource_id: input.resourceId ?? null,
    p_result: input.result ?? "success",
    p_before: input.before ?? null,
    p_after: input.after ?? null,
    ...request,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}
