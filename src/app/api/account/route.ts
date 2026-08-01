import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/authenticated";

export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json();
  const update = {
    display_name: typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 100) || null : undefined,
    locale: body?.locale === "en" ? "en" : body?.locale === "es" ? "es" : undefined,
    timezone: typeof body?.timezone === "string" ? body.timezone.slice(0, 100) : undefined,
    analytics_content_opt_out: typeof body?.analyticsContentOptOut === "boolean" ? body.analyticsContentOptOut : undefined,
  };
  const cleanUpdate = Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined));
  if (!Object.keys(cleanUpdate).length) return NextResponse.json({ error: "No changes" }, { status: 400 });
  const { data, error } = await auth.supabase.from("profiles").update(cleanUpdate).eq("id", auth.userId).select("display_name,locale,timezone,analytics_content_opt_out").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST() {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data, error } = await auth.supabase.from("account_deletion_requests").insert({ user_id: auth.userId }).select("status,requested_at").single();
  if (error?.code === "23505") return NextResponse.json({ error: "A deletion request is already open" }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: data.status, requestedAt: data.requested_at }, { status: 201 });
}
