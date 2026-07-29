import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ModelRoute = {
  route_code: string;
  priority: number;
  model_id: string;
  model_code: string;
  display_name: string;
  provider_code: string;
  base_url: string;
  token_env_var: string;
};

async function callModel(
  url: string,
  token: string,
  model: string,
  messages: Message[],
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Provider returned no usable content");
  }

  return {
    text: String(text),
    inputTokens:
      typeof data?.usage?.prompt_tokens === "number"
        ? data.usage.prompt_tokens
        : null,
    outputTokens:
      typeof data?.usage?.completion_tokens === "number"
        ? data.usage.completion_tokens
        : null,
  };
}

export async function POST(req: Request) {
  const requestStartedAt = Date.now();
  let admin: ReturnType<typeof createAdminClient> | null = null;
  let executionId: string | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId =
      typeof data?.claims?.sub === "string" ? data.claims.sub : null;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const systemPrompt =
      typeof body?.systemPrompt === "string" ? body.systemPrompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });
    }

    const messages: Message[] = [
      {
        role: "system",
        content: systemPrompt || "You are a helpful assistant.",
      },
      { role: "user", content: prompt },
    ];

    admin = createAdminClient();
    const routeCode = process.env.AI_MODEL_ROUTE || "default";

    const { data: routeData, error: routeError } = await admin
      .from("active_model_routes")
      .select(
        "route_code, priority, model_id, model_code, display_name, provider_code, base_url, token_env_var",
      )
      .eq("route_code", routeCode)
      .order("priority", { ascending: true });

    if (routeError) {
      throw new Error(`Model configuration unavailable: ${routeError.message}`);
    }

    const modelRoute = (routeData || []) as ModelRoute[];
    if (modelRoute.length === 0) {
      throw new Error(`No active models configured for route ${routeCode}`);
    }

    const now = new Date().toISOString();
    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .or(`current_period_ends_at.is.null,current_period_ends_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      throw new Error(
        `Could not resolve subscription: ${subscriptionError.message}`,
      );
    }

    let planId = subscription?.plan_id ?? null;
    if (!planId) {
      const { data: freePlan, error: freePlanError } = await admin
        .from("plans")
        .select("id")
        .eq("code", "free")
        .eq("is_active", true)
        .single();

      if (freePlanError) {
        throw new Error(`Free plan unavailable: ${freePlanError.message}`);
      }

      planId = freePlan.id;
    }

    const { data: execution, error: executionError } = await admin
      .from("executions")
      .insert({ user_id: userId, status: "pending" })
      .select("id")
      .single();

    if (executionError) {
      throw new Error(`Could not create execution: ${executionError.message}`);
    }

    executionId = execution.id;
    const errors: string[] = [];

    for (const [index, model] of modelRoute.entries()) {
      const attemptStartedAt = Date.now();
      const { data: attempt, error: attemptError } = await admin
        .from("execution_attempts")
        .insert({
          execution_id: executionId,
          user_id: userId,
          model_id: model.model_id,
          provider_code: model.provider_code,
          model_code: model.model_code,
          attempt_number: index + 1,
          status: "pending",
        })
        .select("id")
        .single();

      if (attemptError) {
        throw new Error(
          `Could not create model attempt: ${attemptError.message}`,
        );
      }

      try {
        const token = process.env[model.token_env_var];
        if (!token) {
          throw new Error(`Missing server token ${model.token_env_var}`);
        }

        const result = await callModel(
          model.base_url,
          token,
          model.model_code,
          messages,
        );
        const latencyMs = Date.now() - attemptStartedAt;

        const { error: completionError } = await admin.rpc(
          "complete_inference_execution",
          {
            p_execution_id: executionId,
            p_attempt_id: attempt.id,
            p_owner_user_id: userId,
            p_applied_plan_id: planId,
            p_attempt_duration_ms: latencyMs,
            p_attempt_input_tokens: result.inputTokens,
            p_attempt_output_tokens: result.outputTokens,
          },
        );

        if (completionError) {
          throw new Error(
            `Could not persist successful execution: ${completionError.message}`,
          );
        }

        return NextResponse.json({
          executionId,
          model: model.model_code,
          provider: model.provider_code,
          text: result.text,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const latencyMs = Date.now() - attemptStartedAt;
        errors.push(`${model.provider_code}/${model.model_code}: ${message}`);

        const { error: attemptUpdateError } = await admin
          .from("execution_attempts")
          .update({
            status: "failed",
            latency_ms: latencyMs,
            error_code: "model_attempt_failed",
            error_detail: message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", attempt.id)
          .eq("execution_id", executionId)
          .eq("user_id", userId)
          .eq("status", "pending");

        if (attemptUpdateError) {
          throw new Error(
            `Could not persist failed attempt: ${attemptUpdateError.message}`,
          );
        }
      }
    }

    const { error: failedExecutionError } = await admin
      .from("executions")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - requestStartedAt,
        error_code: "all_models_failed",
      })
      .eq("id", executionId)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (failedExecutionError) {
      throw new Error(
        `Could not persist failed execution: ${failedExecutionError.message}`,
      );
    }

    return NextResponse.json(
      { error: "No hay modelos disponibles", details: errors },
      { status: 503 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (admin && executionId) {
      await admin
        .from("executions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - requestStartedAt,
          error_code: "inference_internal_error",
        })
        .eq("id", executionId)
        .eq("status", "pending");
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
