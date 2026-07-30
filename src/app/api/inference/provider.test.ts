import assert from "node:assert/strict";
import test from "node:test";
import {
  callModel,
  parseRetryAfter,
  ProviderRequestError,
} from "./provider.ts";

const messages = [{ role: "user" as const, content: "Hello" }];

test("parses Retry-After seconds and HTTP dates", () => {
  assert.equal(parseRetryAfter("1.5"), 1_500);
  assert.equal(
    parseRetryAfter("Wed, 21 Oct 2015 07:28:01 GMT", 1_445_412_480_000),
    1_000,
  );
  assert.equal(parseRetryAfter("invalid"), null);
});

test("retries one 429 after a bounded Retry-After delay", async () => {
  const delays: number[] = [];
  let calls = 0;
  const result = await callModel("https://provider.test", "secret", "model", messages, {
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response('{"error":{"message":"rate limited"}}', {
          status: 429,
          headers: { "Retry-After": "0.01" },
        });
      }
      return Response.json({
        choices: [{ message: { content: "ok" } }],
      });
    },
    sleep: async (milliseconds) => {
      delays.push(milliseconds);
    },
  });

  assert.equal(result.text, "ok");
  assert.equal(calls, 2);
  assert.deepEqual(delays, [10]);
});

test("does not retry a long Retry-After and classifies 429", async () => {
  let calls = 0;

  await assert.rejects(
    callModel("https://provider.test", "secret", "model", messages, {
      fetchImpl: async () => {
        calls += 1;
        return new Response('{"error":{"message":"capacity exhausted"}}', {
          status: 429,
          headers: { "Retry-After": "30" },
        });
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderRequestError);
      assert.equal(error.code, "provider_rate_limited");
      assert.equal(error.status, 429);
      assert.equal(error.retryAfterMs, 30_000);
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("classifies 402 without retrying or retaining provider messages", async () => {
  let calls = 0;

  await assert.rejects(
    callModel("https://provider.test", "secret", "model", messages, {
      fetchImpl: async () => {
        calls += 1;
        return new Response(
          '{"error":{"code":"payment_required","message":"private request contents"}}',
          { status: 402 },
        );
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderRequestError);
      assert.equal(error.code, "provider_payment_required");
      assert.equal(error.detail, "provider_code=payment_required");
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("retries one 503 with a short Retry-After and then classifies failure", async () => {
  let calls = 0;

  await assert.rejects(
    callModel("https://provider.test", "secret", "model", messages, {
      fetchImpl: async () => {
        calls += 1;
        return new Response(
          '{"error":{"type":"service_unavailable","message":"internal diagnostics"}}',
          {
            status: 503,
            headers: { "Retry-After": "0" },
          },
        );
      },
      sleep: async () => undefined,
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderRequestError);
      assert.equal(error.code, "provider_unavailable");
      assert.equal(error.detail, "provider_type=service_unavailable");
      return true;
    },
  );
  assert.equal(calls, 2);
});

test("classifies other server errors without retrying", async () => {
  let calls = 0;

  await assert.rejects(
    callModel("https://provider.test", "secret", "model", messages, {
      fetchImpl: async () => {
        calls += 1;
        return new Response('{"error":{"code":"upstream_failure"}}', {
          status: 500,
        });
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderRequestError);
      assert.equal(error.code, "provider_server_error");
      assert.equal(error.detail, "provider_code=upstream_failure");
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("does not persist arbitrary non-JSON provider response bodies", async () => {
  await assert.rejects(
    callModel("https://provider.test", "secret", "model", messages, {
      fetchImpl: async () =>
        new Response("prompt contents and upstream proxy diagnostics", {
          status: 503,
          statusText: "Service Unavailable",
        }),
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderRequestError);
      assert.equal(error.code, "provider_unavailable");
      assert.equal(error.detail, "Service Unavailable");
      return true;
    },
  );
});
