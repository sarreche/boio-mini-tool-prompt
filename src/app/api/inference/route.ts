import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticatedUser } from "@/lib/supabase/authenticated";
import { callModel, ProviderRequestError, type ProviderMessage } from "./provider";

type ModelRoute = { route_code: string; priority: number; model_id: string; model_code: string; display_name: string; provider_code: string; base_url: string; token_env_var: string };
type TaskConfiguration = { id: string; code: string; is_active: boolean; task_translations: { locale: string; system_prompt: string; user_prompt_template: string }[] };

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json();
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  const locale = body?.locale === "en" ? "en" : "es";
  const taskCode = typeof body?.taskCode === "string" ? body.taskCode : null;
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
  const regenerationId = typeof body?.regenerationOfExecutionId === "string" ? body.regenerationOfExecutionId : null;
  const clientRequestId = typeof body?.clientRequestId === "string" && /^[0-9a-f-]{36}$/i.test(body.clientRequestId) ? body.clientRequestId : null;
  if (!input || !clientRequestId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const admin = createAdminClient();
  let task: TaskConfiguration | null = null;
  if (taskCode) {
    const { data, error } = await admin.from("tasks").select("id,code,is_active,task_translations!inner(locale,system_prompt,user_prompt_template)").eq("code", taskCode).eq("is_active", true).eq("task_translations.locale", locale).single();
    if (error || !data) return NextResponse.json({ error: "Task not available" }, { status: 400 });
    task = data as TaskConfiguration;
  }
  if (regenerationId) {
    const { data } = await admin.from("executions").select("id,conversation_id,request_message_id").eq("id", regenerationId).eq("user_id", auth.userId).eq("conversation_id", conversationId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Regeneration not allowed" }, { status: 403 });
  }

  const template = task?.task_translations?.[0];
  const systemPrompt = template?.system_prompt || (locale === "es" ? "Sos un asistente claro y práctico en español." : "You are a clear and practical assistant. Respond in English.");
  const currentPrompt = template?.user_prompt_template?.replaceAll("{{input}}", input) || input;
  const title = input.replace(/\s+/g, " ").slice(0, 80);

  const { data: startedRows, error: startError } = await admin.rpc("begin_chat_execution", {
    p_owner_user_id: auth.userId, p_conversation_id: conversationId, p_task_id: task?.id ?? null,
    p_input: input, p_title: title, p_client_request_id: clientRequestId, p_regeneration_of_id: regenerationId,
  });
  if (startError || !startedRows?.[0]) return NextResponse.json({ error: startError?.message ?? "Could not start conversation" }, { status: 500 });
  const started = startedRows[0];

  const { data: existingExecution } = await admin.from("executions").select("status,response_message_id").eq("id", started.execution_id).single();
  if (existingExecution?.status === "succeeded" && existingExecution.response_message_id) {
    const { data: responseMessage } = await admin.from("messages").select("content").eq("id", existingExecution.response_message_id).eq("user_id", auth.userId).single();
    return NextResponse.json({ conversationId: started.conversation_id, requestMessageId: started.request_message_id, responseMessageId: existingExecution.response_message_id, executionId: started.execution_id, text: responseMessage?.content ?? "", replayed: true });
  }

  const [{ data: history, error: historyError }, { data: modelData, error: routeError }] = await Promise.all([
    admin.from("messages").select("id,role,content,sequence_number").eq("conversation_id", started.conversation_id).eq("user_id", auth.userId).order("sequence_number").limit(50),
    admin.from("active_model_routes").select("route_code,priority,model_id,model_code,display_name,provider_code,base_url,token_env_var").eq("route_code", process.env.AI_MODEL_ROUTE || "default").order("priority"),
  ]);
  if (historyError || routeError || !modelData?.length) {
    await admin.rpc("fail_chat_execution", { p_execution_id: started.execution_id, p_owner_user_id: auth.userId, p_error_code: "configuration_unavailable" });
    return NextResponse.json({ error: "Model configuration unavailable" }, { status: 503 });
  }
  const messages: ProviderMessage[] = [{ role: "system", content: systemPrompt }];
  for (const message of history ?? []) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const isCurrent = message.id === started.request_message_id;
    messages.push({ role: message.role, content: isCurrent ? currentPrompt : message.content });
  }

  const now = new Date().toISOString();
  const { data: subscription } = await admin.from("subscriptions").select("plan_id").eq("user_id", auth.userId).eq("status", "active").or(`current_period_ends_at.is.null,current_period_ends_at.gt.${now}`).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let planId = subscription?.plan_id;
  if (!planId) {
    const { data: freePlan } = await admin.from("plans").select("id").eq("code", "free").eq("is_active", true).single();
    planId = freePlan?.id;
  }

  const errors: string[] = [];
  for (const [index, model] of (modelData as ModelRoute[]).entries()) {
    const attemptStarted = Date.now();
    const { data: attempt, error: attemptError } = await admin.from("execution_attempts").insert({ execution_id: started.execution_id, user_id: auth.userId, model_id: model.model_id, provider_code: model.provider_code, model_code: model.model_code, attempt_number: index + 1, status: "pending" }).select("id").single();
    if (attemptError) break;
    try {
      const token = process.env[model.token_env_var];
      if (!token) throw new Error(`Missing server token ${model.token_env_var}`);
      const result = await callModel(model.base_url, token, model.model_code, messages);
      const { data: responseMessageId, error: completionError } = await admin.rpc("complete_chat_execution", {
        p_execution_id: started.execution_id, p_attempt_id: attempt.id, p_owner_user_id: auth.userId, p_applied_plan_id: planId,
        p_response: result.text, p_attempt_duration_ms: Date.now() - attemptStarted,
        p_attempt_input_tokens: result.inputTokens, p_attempt_output_tokens: result.outputTokens,
      });
      if (completionError) throw new Error(completionError.message);
      return NextResponse.json({ conversationId: started.conversation_id, requestMessageId: started.request_message_id, responseMessageId, executionId: started.execution_id, model: model.model_code, provider: model.provider_code, text: result.text });
    } catch (error) {
      const providerError = error instanceof ProviderRequestError ? error : null;
      const detail = [
        `provider=${model.provider_code}`,
        `model=${model.model_code}`,
        providerError?.status ? `http_status=${providerError.status}` : null,
        providerError?.retryAfterMs !== null && providerError?.retryAfterMs !== undefined ? `retry_after_ms=${providerError.retryAfterMs}` : null,
        `message=${providerError?.detail ?? (error instanceof Error ? error.message : String(error))}`,
      ].filter(Boolean).join("; ").slice(0, 1_000);
      errors.push(`${model.provider_code}/${model.model_code}: ${detail}`);
      await admin.from("execution_attempts").update({ status: "failed", latency_ms: Date.now() - attemptStarted, error_code: providerError?.code ?? "model_attempt_failed", error_detail: detail, completed_at: new Date().toISOString() }).eq("id", attempt.id).eq("execution_id", started.execution_id).eq("user_id", auth.userId).eq("status", "pending");
    }
  }
  await admin.rpc("fail_chat_execution", { p_execution_id: started.execution_id, p_owner_user_id: auth.userId, p_error_code: "all_models_failed" });
  return NextResponse.json({ error: "No models available", details: errors }, { status: 503 });
}
