import type { FastifyInstance, InjectOptions } from "fastify";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { canonicalize, hashDecisionMemo, buildDecisionMemo } from "./domain/memo";

const auth = { "x-api-key": "test-key" };
const invoiceA = "a".repeat(64);

function inject(app: FastifyInstance, options: InjectOptions) {
  return app.inject({
    ...options,
    headers: { ...auth, ...(options.headers ?? {}) },
  });
}
const invoiceB = "b".repeat(64);
const hashB = "b".repeat(64);
const hashC = "c".repeat(64);

const policy = {
  maxSingleInvoice: "100000",
  maxDebtorExposure: "250000",
  minDiscountBps: 100,
  maxDiscountBps: 1000,
};

async function setup() {
  const app = buildApp({ apiKey: "test-key" });
  const response = await inject(app, {
    method: "PUT", headers: auth,
    url: "/v1/policy",
    payload: policy,
  });
  expect(response.statusCode).toBe(200);
  return app;
}

function decisionPayload(invoiceId: string, approved = true, nonce = `nonce-${invoiceId.slice(0, 8)}`) {
  return {
    invoiceId,
    approved,
    score: 80,
    priceBps: 250,
    model: "test/model",
    promptHash: hashB,
    inputsHash: hashC,
    nonce,
  };
}

describe("saksi api", () => {
  it("reports health", async () => {
    const app = buildApp({ apiKey: "test-key" });
    const response = await inject(app, { method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "saksi-api" });
  });

  it("sets and reads policy", async () => {
    const app = await setup();
    const response = await inject(app, { method: "GET", url: "/v1/policy" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(policy);
  });

  it("rejects invalid policy", async () => {
    const app = buildApp({ apiKey: "test-key" });
    const response = await inject(app, {
      method: "PUT", headers: auth,
      url: "/v1/policy",
      payload: { ...policy, maxSingleInvoice: "0" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects mutating requests without an API key", async () => {
    const app = buildApp({ apiKey: "test-key" });
    const response = await app.inject({
      method: "PUT",
      url: "/v1/policy",
      payload: policy,
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe("UNAUTHORIZED");
  });

  it("rejects encoded paths without an API key", async () => {
    const app = buildApp({ apiKey: "test-key" });
    const response = await app.inject({
      method: "PUT",
      url: "/%76%31/policy",
      payload: policy,
    });
    expect(response.statusCode).toBe(401);
  });

  it("requires auth for reads", async () => {
    const app = await setup();
    const response = await app.inject({ method: "GET", url: "/v1/policy" });
    expect(response.statusCode).toBe(401);
  });

  it("rejects case-variant duplicate invoice ids", async () => {
    const app = await setup();
    const payload = {
      invoiceId: invoiceA,
      debtor: "debtor-a",
      amount: "50000",
      discountBps: 300,
    };
    expect((await inject(app, { method: "POST", url: "/v1/invoices", payload })).statusCode).toBe(201);
    expect(
      (
        await inject(app, {
          method: "POST",
          url: "/v1/invoices",
          payload: { ...payload, invoiceId: invoiceA.toUpperCase() },
        })
      ).statusCode,
    ).toBe(409);
  });

  it("rejects non-canonical debtor ids", async () => {
    const app = await setup();
    const response = await inject(app, {
      method: "POST",
      url: "/v1/invoices",
      payload: { invoiceId: invoiceA, debtor: "Debtor-A", amount: "50000", discountBps: 300 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("INVALID_BODY");
  });

  it("rejects a reused nonce", async () => {
    const app = await setup();
    for (const id of [invoiceA, invoiceB]) {
      await inject(app, {
        method: "POST",
        url: "/v1/invoices",
        payload: { invoiceId: id, debtor: "debtor-a", amount: "50000", discountBps: 300 },
      });
    }
    expect(
      (
        await inject(app, {
          method: "POST",
          url: "/v1/decisions",
          payload: decisionPayload(invoiceA, true, "nonce-shared"),
        })
      ).statusCode,
    ).toBe(201);
    const second = await inject(app, {
      method: "POST",
      url: "/v1/decisions",
      payload: decisionPayload(invoiceB, true, "nonce-shared"),
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error).toBe("NONCE_REUSED");
  });

  it("registers an invoice and tracks exposure", async () => {
    const app = await setup();
    const created = await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/invoices",
      payload: { invoiceId: invoiceA, debtor: "debtor-a", amount: "50000", discountBps: 300 },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().amount).toBe("50000");

    const exposure = await inject(app, { method: "GET", url: "/v1/exposure/debtor-a" });
    expect(exposure.statusCode).toBe(200);
    expect(exposure.json().exposure).toBe("50000");
  });

  it("rejects invoice above single cap", async () => {
    const app = await setup();
    const response = await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/invoices",
      payload: { invoiceId: invoiceA, debtor: "debtor-a", amount: "100001", discountBps: 300 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("SINGLE_INVOICE_CAP_EXCEEDED");
  });

  it("rejects duplicate invoice", async () => {
    const app = await setup();
    const payload = {
      invoiceId: invoiceA,
      debtor: "debtor-a",
      amount: "50000",
      discountBps: 300,
    };
    expect((await inject(app, { method: "POST", headers: auth, url: "/v1/invoices", payload })).statusCode).toBe(201);
    expect((await inject(app, { method: "POST", headers: auth, url: "/v1/invoices", payload })).statusCode).toBe(409);
  });

  it("approves a decision and keeps exposure", async () => {
    const app = await setup();
    await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/invoices",
      payload: { invoiceId: invoiceA, debtor: "debtor-a", amount: "50000", discountBps: 300 },
    });
    const response = await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/decisions",
      payload: decisionPayload(invoiceA),
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.decisionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.memo.version).toBe("saksi.decision.v1");

    const invoice = await inject(app, { method: "GET", url: `/v1/invoices/${invoiceA}` });
    expect(invoice.json().status).toBe("approved");

    const exposure = await inject(app, { method: "GET", url: "/v1/exposure/debtor-a" });
    expect(exposure.json().exposure).toBe("50000");
  });

  it("rejects a decision and releases exposure", async () => {
    const app = await setup();
    await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/invoices",
      payload: { invoiceId: invoiceA, debtor: "debtor-a", amount: "50000", discountBps: 300 },
    });
    const response = await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/decisions",
      payload: decisionPayload(invoiceA, false),
    });
    expect(response.statusCode).toBe(201);

    const exposure = await inject(app, { method: "GET", url: "/v1/exposure/debtor-a" });
    expect(exposure.json().exposure).toBe("0");
  });

  it("allows rejection after policy tightening and releases exposure", async () => {
    const app = await setup();
    await inject(app, {
      method: "POST",
      url: "/v1/invoices",
      payload: { invoiceId: invoiceA, debtor: "debtor-a", amount: "50000", discountBps: 300 },
    });
    await inject(app, {
      method: "PUT",
      url: "/v1/policy",
      payload: {
        maxSingleInvoice: "10000",
        maxDebtorExposure: "10000",
        minDiscountBps: 100,
        maxDiscountBps: 1000,
      },
    });
    const response = await inject(app, {
      method: "POST",
      url: "/v1/decisions",
      payload: decisionPayload(invoiceA, false),
    });
    expect(response.statusCode).toBe(201);
    const exposure = await inject(app, { method: "GET", url: "/v1/exposure/debtor-a" });
    expect(exposure.json().exposure).toBe("0");
  });

  it("rejects non-canonical exposure reads", async () => {
    const app = await setup();
    const response = await inject(app, {
      method: "GET",
      url: "/v1/exposure/Debtor-A",
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("INVALID_DEBTOR");
  });

  it("rejects a second decision for the same invoice", async () => {
    const app = await setup();
    await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/invoices",
      payload: { invoiceId: invoiceA, debtor: "debtor-a", amount: "50000", discountBps: 300 },
    });
    expect(
      (
        await inject(app, {
          method: "POST", headers: auth,
          url: "/v1/decisions",
          payload: decisionPayload(invoiceA),
        })
      ).statusCode,
    ).toBe(201);
    expect(
      (
        await inject(app, {
          method: "POST", headers: auth,
          url: "/v1/decisions",
          payload: decisionPayload(invoiceA),
        })
      ).statusCode,
    ).toBe(409);
  });

  it("binds the decision hash to the invoice", async () => {
    const app = await setup();
    await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/invoices",
      payload: { invoiceId: invoiceA, debtor: "debtor-a", amount: "50000", discountBps: 300 },
    });
    await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/invoices",
      payload: { invoiceId: invoiceB, debtor: "debtor-b", amount: "50000", discountBps: 300 },
    });

    const first = await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/decisions",
      payload: decisionPayload(invoiceA),
    });
    const second = await inject(app, {
      method: "POST", headers: auth,
      url: "/v1/decisions",
      payload: decisionPayload(invoiceB),
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(first.json().decisionHash).not.toBe(second.json().decisionHash);
    expect(first.json().memo.invoice_id).toBe(invoiceA);
    expect(second.json().memo.invoice_id).toBe(invoiceB);
  });
});

describe("x402", () => {
  const config = {
    network: "stellar:testnet",
    payTo: "GPAYTO",
    asset: "USDC:GISSUER",
    amount: "10000000",
    resource: "http://localhost/v1/x402/risk-report",
    horizonUrl: "http://horizon.invalid",
    maxTimeoutSeconds: 60,
  };
  const txOk = "d".repeat(64);
  const txBad = "e".repeat(64);
  const verifier = {
    async verify(proof: { txHash: string }) {
      return proof.txHash === txOk
        ? { ok: true, from: "GPAYER" }
        : { ok: false, reason: "invalid payment" };
    },
  };

  async function x402App() {
    const app = buildApp({ apiKey: "test-key", x402: config, paymentVerifier: verifier });
    await inject(app, { method: "PUT", url: "/v1/policy", payload: policy });
    await inject(app, {
      method: "POST",
      url: "/v1/invoices",
      payload: { invoiceId: invoiceA, debtor: "debtor-a", amount: "50000", discountBps: 300 },
    });
    return app;
  }

  function proof(txHash: string) {
    return Buffer.from(JSON.stringify({ txHash }), "utf8").toString("base64");
  }

  it("returns 402 with a payment requirement", async () => {
    const app = await x402App();
    const response = await app.inject({
      method: "POST",
      url: "/v1/x402/risk-report",
      payload: { invoiceId: invoiceA },
    });
    expect(response.statusCode).toBe(402);
    const body = response.json();
    expect(body.x402Version).toBe(1);
    expect(body.accepts[0].payTo).toBe("GPAYTO");
    expect(body.accepts[0].extra.invoiceId).toBe(invoiceA);
  });

  it("returns the report for a valid payment and rejects replay", async () => {
    const app = await x402App();
    const first = await app.inject({
      method: "POST",
      url: "/v1/x402/risk-report",
      payload: { invoiceId: invoiceA },
      headers: { "x-payment": proof(txOk) },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().report.invoiceId).toBe(invoiceA);

    const replay = await app.inject({
      method: "POST",
      url: "/v1/x402/risk-report",
      payload: { invoiceId: invoiceA },
      headers: { "x-payment": proof(txOk) },
    });
    expect(replay.statusCode).toBe(409);
  });

  it("rejects an invalid payment proof", async () => {
    const app = await x402App();
    const response = await app.inject({
      method: "POST",
      url: "/v1/x402/risk-report",
      payload: { invoiceId: invoiceA },
      headers: { "x-payment": proof(txBad) },
    });
    expect(response.statusCode).toBe(402);
    expect(response.json().error).toBe("invalid payment");
  });
});

describe("canonical memo", () => {
  it("is deterministic regardless of key insertion order", () => {
    const left = canonicalize({ b: 2, a: 1 });
    const right = canonicalize({ a: 1, b: 2 });
    expect(left).toBe(right);
  });

  it("hashes the same memo to the same value", () => {
    const memo = buildDecisionMemo({
      invoiceId: invoiceA,
      debtor: "debtor-a",
      amount: 50000n,
      discountBps: 300,
      policyHash: hashB,
      approved: true,
      score: 80,
      priceBps: 250,
      model: "test/model",
      promptHash: hashB,
      inputsHash: hashC,
      nonce: "nonce-0001",
      createdAt: "2026-10-19T00:00:00.000Z",
    });
    expect(hashDecisionMemo(memo)).toBe(hashDecisionMemo({ ...memo }));
  });
});
