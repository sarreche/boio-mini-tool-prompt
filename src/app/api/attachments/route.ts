import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticatedUser } from "@/lib/supabase/authenticated";

const BUCKET = "chat-attachments";
const MAX_FILES = 3;
const MAX_BYTES = 1_048_576;
const allowed = new Map([["text/plain", ".txt"], ["text/markdown", ".md"]]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const form = await request.formData();
  let conversationId = String(form.get("conversationId") ?? "");
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  if (!files.length || files.length > MAX_FILES) return NextResponse.json({ error: "Invalid attachment request" }, { status: 400 });
  const admin = createAdminClient();
  const { data: access } = await admin.rpc("get_effective_product_access", { p_user_id: auth.userId });
  let conversation = conversationId ? (await admin.from("conversations").select("id").eq("id", conversationId).eq("user_id", auth.userId).is("archived_at", null).maybeSingle()).data : null;
  if (!conversationId) { const created = await admin.from("conversations").insert({ user_id: auth.userId, title: null }).select("id").single(); if (created.error) return NextResponse.json({ error: "Could not prepare conversation" }, { status: 500 }); conversation=created.data; conversationId=created.data.id; }
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (!access?.attachments?.enabled) return NextResponse.json({ error: "Attachments require a Paid plan", code: "attachments_not_enabled" }, { status: 403 });

  const uploaded: { id: string; name: string }[] = [];
  const paths: string[] = [];
  try {
    for (const file of files) {
      const extension = allowed.get(file.type);
      if (!extension || file.size > MAX_BYTES || !file.name.toLowerCase().endsWith(extension)) throw new Error("Only UTF-8 TXT/MD files up to 1 MB are allowed");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (content.includes("\u0000")) throw new Error("Invalid text file");
      const path = `${auth.userId}/${conversationId}/${randomUUID()}${extension}`;
      const stored = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
      if (stored.error) throw stored.error;
      paths.push(path);
      const row = await admin.from("attachments").insert({ conversation_id: conversationId, user_id: auth.userId, storage_bucket: BUCKET, storage_path: path, original_filename: file.name.slice(0, 255), media_type: file.type, size_bytes: file.size }).select("id,original_filename").single();
      if (row.error) throw row.error;
      uploaded.push({ id: row.data.id, name: row.data.original_filename });
    }
    return NextResponse.json({ attachments: uploaded, conversationId }, { status: 201 });
  } catch (error) {
    if (paths.length) await admin.storage.from(BUCKET).remove(paths);
    if (uploaded.length) await admin.from("attachments").delete().in("id", uploaded.map((item) => item.id)).eq("user_id", auth.userId);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Attachment upload failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin.from("attachments").select("storage_bucket,storage_path").eq("id", id).eq("user_id", auth.userId).maybeSingle();
  if (!data) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  const removed = await admin.storage.from(data.storage_bucket).remove([data.storage_path]);
  if (removed.error) return NextResponse.json({ error: "Could not remove attachment" }, { status: 500 });
  await admin.from("attachments").delete().eq("id", id).eq("user_id", auth.userId);
  return new NextResponse(null, { status: 204 });
}
