import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/authenticated";

type Context = { params: Promise<{ id: string }> };
type MessageQueryRow = { id: string; role: ChatMessageRole; content: string; sequence_number: number; created_at: string; ratings: { is_helpful: boolean; comment: string | null }[] };
type ChatMessageRole = "system" | "user" | "assistant" | "tool";

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const { data: conversation, error } = await auth.supabase.from("conversations")
    .select("id,title,updated_at,initial_task_id,messages(id,role,content,sequence_number,created_at,ratings(is_helpful,comment))")
    .eq("id", id).eq("user_id", auth.userId).single();
  if (error) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const { data: executions } = await auth.supabase.from("executions").select("id,response_message_id").eq("conversation_id", id).eq("user_id", auth.userId).eq("status", "succeeded");
  const executionByMessage = new Map((executions ?? []).filter((item) => item.response_message_id).map((item) => [item.response_message_id!, item.id]));
  const messages = ([...(conversation.messages ?? [])] as MessageQueryRow[]).sort((a, b) => a.sequence_number - b.sequence_number).map((message) => ({
    id: message.id, role: message.role, content: message.content, sequenceNumber: message.sequence_number, createdAt: message.created_at,
    rating: message.ratings?.[0] ? { isHelpful: message.ratings[0].is_helpful, comment: message.ratings[0].comment } : null,
    executionId: executionByMessage.get(message.id) ?? null,
  }));
  return NextResponse.json({ id: conversation.id, title: conversation.title, updatedAt: conversation.updated_at, initialTaskId: conversation.initial_task_id, messages });
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const title = typeof body?.title === "string" ? body.title.trim() : null;
  if (body?.archived !== true && (!title || title.length > 120)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const changes = body.archived === true ? { archived_at: new Date().toISOString() } : { title, updated_at: new Date().toISOString() };
  const { data, error } = await auth.supabase.from("conversations").update(changes).eq("id", id).eq("user_id", auth.userId).select("id,title").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  return NextResponse.json({ id: data.id, title: data.title, archived: body.archived === true });
}
