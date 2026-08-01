import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticatedUser } from "@/lib/supabase/authenticated";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();
  const [{ data: access }, { data: conversation }, { data: messages }] = await Promise.all([
    admin.rpc("get_effective_product_access", { p_user_id: auth.userId }),
    admin.from("conversations").select("id,title,created_at").eq("id", id).eq("user_id", auth.userId).maybeSingle(),
    admin.from("messages").select("role,content,created_at").eq("conversation_id", id).eq("user_id", auth.userId).order("sequence_number"),
  ]);
  if (!access?.conversationExport?.enabled) return NextResponse.json({ error: "Export requires a Paid plan", code: "export_not_enabled" }, { status: 403 });
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const safeTitle = (conversation.title || "conversation").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
  const markdown = [`# ${conversation.title || "Conversation"}`, "", `_${conversation.created_at}_`, "", ...(messages ?? []).flatMap((message) => [`## ${message.role === "user" ? "User" : "Assistant"}`, "", message.content, ""])].join("\n");
  return new NextResponse(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${safeTitle}.md"`, "Cache-Control": "private, no-store" } });
}
