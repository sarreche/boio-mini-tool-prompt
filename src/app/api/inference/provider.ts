export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ModelResult = {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

type FetchLike = typeof fetch;
type Sleep = (milliseconds: number) => Promise<void>;

const MAX_ERROR_DETAIL_LENGTH = 500;
const MAX_RETRY_AFTER_MS = 2_000;
const RETRYABLE_STATUSES = new Set([429, 503]);

export class ProviderRequestError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly detail: string;
  readonly retryAfterMs: number | null;

  constructor(
    code: string,
    status: number | null,
    detail: string,
    retryAfterMs: number | null = null,
  ) {
    super(detail);
    this.name = "ProviderRequestError";
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.retryAfterMs = retryAfterMs;
  }
}

function redactSensitiveText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|hf_[A-Za-z0-9]{8,})\b/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, MAX_ERROR_DETAIL_LENGTH);
}

function getProviderErrorMetadata(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const error = record.error;
  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    const code =
      typeof errorRecord.code === "string" ? errorRecord.code : null;
    const type =
      typeof errorRecord.type === "string" ? errorRecord.type : null;
    if (code || type) {
      return [
        code ? `provider_code=${redactSensitiveText(code)}` : null,
        type ? `provider_type=${redactSensitiveText(type)}` : null,
      ]
        .filter(Boolean)
        .join("; ");
    }
  }
  return null;
}

async function readSafeErrorDetail(response: Response) {
  const fallback = response.statusText || "Provider request failed";

  try {
    const raw = (await response.text()).slice(0, 4_096);
    if (!raw) return fallback;

    try {
      const metadata = getProviderErrorMetadata(JSON.parse(raw));
      return redactSensitiveText(metadata || fallback);
    } catch {
      return fallback;
    }
  } catch {
    return fallback;
  }
}

export function parseRetryAfter(value: string | null, now = Date.now()) {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1_000);
  }

  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

function errorCodeForStatus(status: number) {
  if (status === 429) return "provider_rate_limited";
  if (status === 503) return "provider_unavailable";
  if (status === 402) return "provider_payment_required";
  if (status >= 500) return "provider_server_error";
  if (status >= 400) return "provider_request_rejected";
  return "provider_invalid_response";
}

export async function callModel(
  url: string,
  token: string,
  model: string,
  messages: ProviderMessage[],
  options: {
    fetchImpl?: FetchLike;
    sleep?: Sleep;
    maxRetryAfterMs?: number;
  } = {},
): Promise<ModelResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ??
    ((milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const maxRetryAfterMs = options.maxRetryAfterMs ?? MAX_RETRY_AFTER_MS;

  for (let requestNumber = 1; requestNumber <= 2; requestNumber += 1) {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages }),
      });
    } catch {
      throw new ProviderRequestError(
        "provider_network_error",
        null,
        "Network request failed",
      );
    }

    if (!response.ok) {
      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      const detail = await readSafeErrorDetail(response);
      const canRetry =
        requestNumber === 1 &&
        RETRYABLE_STATUSES.has(response.status) &&
        retryAfterMs !== null &&
        retryAfterMs <= maxRetryAfterMs;

      if (canRetry) {
        await sleep(retryAfterMs);
        continue;
      }

      throw new ProviderRequestError(
        errorCodeForStatus(response.status),
        response.status,
        detail,
        retryAfterMs,
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new ProviderRequestError(
        "provider_invalid_response",
        response.status,
        "Provider returned invalid JSON",
      );
    }

    const record = data as {
      choices?: Array<{ message?: { content?: unknown } }>;
      usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
    };
    const text = record?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new ProviderRequestError(
        "provider_empty_response",
        response.status,
        "Provider returned no usable content",
      );
    }

    return {
      text,
      inputTokens:
        typeof record.usage?.prompt_tokens === "number"
          ? record.usage.prompt_tokens
          : null,
      outputTokens:
        typeof record.usage?.completion_tokens === "number"
          ? record.usage.completion_tokens
          : null,
    };
  }

  throw new ProviderRequestError(
    "provider_retry_exhausted",
    null,
    "Provider retry limit reached",
  );
}
