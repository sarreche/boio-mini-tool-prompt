import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/authenticated";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json();
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  const isHelpful = typeof body?.isHelpful === "boolean" ? body.isHelpful : null;
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 1000) || null : null;
  if (!messageId || isHelpful === null) return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  const { data, error } = await auth.supabase.from("ratings").upsert({ user_id: auth.userId, message_id: messageId, is_helpful: isHelpful, comment }, { onConflict: "message_id" }).select("is_helpful,comment").single();
  if (error) return NextResponse.json({ error: "Rating not allowed" }, { status: 403 });
  return NextResponse.json({ isHelpful: data.is_helpful, comment: data.comment });
}
