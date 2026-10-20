import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileReplayStore } from "./x402/replay";
import { StellarPaymentVerifier } from "./x402/stellar";
import { requirementFor, type X402Config } from "./x402/types";

const config: X402Config = {
  network: "stellar:testnet",
  payTo: "GPAYTO",
  asset: "USDC:GISSUER",
  amount: "10000000",
  resource: "http://localhost/v1/x402/risk-report",
  horizonUrl: "https://horizon.test",
  maxTimeoutSeconds: 60,
};

const invoiceId = "a".repeat(64);
const txHash = "b".repeat(64);

function mockHorizon(options: { amount?: string; memo?: string; createdAt?: string } = {}) {
  const requirement = requirementFor(config, invoiceId);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request) => {
      const target = String(url);
      if (target.endsWith(`/transactions/${txHash}`)) {
        return new Response(
          JSON.stringify({
            successful: true,
            memo: options.memo ?? requirement.extra.memo,
            created_at: options.createdAt ?? new Date().toISOString(),
          }),
          { status: 200 },
        );
      }
      if (target.endsWith(`/transactions/${txHash}/payments`)) {
        return new Response(
          JSON.stringify({
            _embedded: {
              records: [
                {
                  type: "payment",
                  asset_type: "credit_alphanum4",
                  asset_code: "USDC",
                  asset_issuer: "GISSUER",
                  from: "GPAYER",
                  to: "GPAYTO",
                  amount: options.amount ?? "1.0000000",
                },
              ],
            },
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    }),
  );
  return requirement;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StellarPaymentVerifier", () => {
  it("accepts a matching payment", async () => {
    const requirement = mockHorizon();
    const verifier = new StellarPaymentVerifier(config);
    const result = await verifier.verify({ txHash }, requirement);
    expect(result).toEqual({ ok: true, from: "GPAYER" });
  });

  it("rejects an underpaid payment", async () => {
    const requirement = mockHorizon({ amount: "0.9999999" });
    const verifier = new StellarPaymentVerifier(config);
    const result = await verifier.verify({ txHash }, requirement);
    expect(result.ok).toBe(false);
  });

  it("rejects a wrong memo", async () => {
    const requirement = mockHorizon({ memo: "wrong" });
    const verifier = new StellarPaymentVerifier(config);
    const result = await verifier.verify({ txHash }, requirement);
    expect(result.ok).toBe(false);
  });

  it("rejects an expired proof", async () => {
    const requirement = mockHorizon({
      createdAt: new Date(Date.now() - 120_000).toISOString(),
    });
    const verifier = new StellarPaymentVerifier(config);
    const result = await verifier.verify({ txHash }, requirement);
    expect(result).toEqual({ ok: false, reason: "payment proof expired" });
  });
});

describe("FileReplayStore", () => {
  it("claims a transaction once", async () => {
    const dir = await mkdtemp(join(tmpdir(), "saksi-replay-"));
    try {
      const store = new FileReplayStore(dir);
      expect(await store.claim(txHash)).toBe(true);
      expect(await store.claim(txHash)).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
