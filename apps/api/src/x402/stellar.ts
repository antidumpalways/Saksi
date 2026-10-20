import type {
  PaymentProof,
  PaymentRequirement,
  PaymentVerification,
  PaymentVerifier,
  X402Config,
} from "./types";

interface HorizonTransaction {
  successful: boolean;
  memo?: string;
  created_at?: string;
}

interface HorizonPayment {
  type: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  from: string;
  to: string;
  amount: string;
}

function toStroops(value: string): bigint {
  const trimmed = value.trim();
  const parts = trimmed.split(".");
  const whole = parts[0];
  const fraction = parts[1] ?? "";
  if (parts.length > 2 || whole === undefined || !/^\d+$/.test(whole) || !/^\d{0,7}$/.test(fraction)) {
    throw new Error("invalid decimal amount");
  }
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, "0"));
}

function assetMatches(asset: string, payment: HorizonPayment): boolean {
  if (asset === "native") {
    return payment.asset_type === "native";
  }
  const parts = asset.split(":");
  const code = parts[0];
  const issuer = parts[1];
  if (!code || !issuer) return false;
  return (
    payment.asset_type !== "native" &&
    payment.asset_code === code &&
    payment.asset_issuer === issuer
  );
}

export class StellarPaymentVerifier implements PaymentVerifier {
  constructor(private readonly config: X402Config) {}

  async verify(
    proof: PaymentProof,
    requirement: PaymentRequirement,
  ): Promise<PaymentVerification> {
    const txHash = proof.txHash.toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(txHash)) {
      return { ok: false, reason: "invalid transaction hash" };
    }
    if (requirement.network !== this.config.network) {
      return { ok: false, reason: "network mismatch" };
    }

    const base = this.config.horizonUrl.replace(/\/$/, "");
    try {
      const txResponse = await fetch(`${base}/transactions/${txHash}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!txResponse.ok) {
        return { ok: false, reason: "transaction not found" };
      }
      const tx = (await txResponse.json()) as HorizonTransaction;
      if (!tx.successful) {
        return { ok: false, reason: "transaction failed" };
      }
      if ((tx.memo ?? "") !== requirement.extra.memo) {
        return { ok: false, reason: "memo mismatch" };
      }
      if (!tx.created_at) {
        return { ok: false, reason: "missing transaction time" };
      }
      const ageMs = Date.now() - Date.parse(tx.created_at);
      if (!Number.isFinite(ageMs) || ageMs > this.config.maxTimeoutSeconds * 1_000) {
        return { ok: false, reason: "payment proof expired" };
      }

      const paymentsResponse = await fetch(
        `${base}/transactions/${txHash}/payments`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!paymentsResponse.ok) {
        return { ok: false, reason: "payments not found" };
      }
      const body = (await paymentsResponse.json()) as {
        _embedded?: { records?: HorizonPayment[] };
      };
      const records = body._embedded?.records ?? [];
      const required = BigInt(requirement.maxAmountRequired);

      for (const payment of records) {
        if (payment.type !== "payment") continue;
        if (payment.to !== requirement.payTo) continue;
        if (!assetMatches(requirement.asset, payment)) continue;
        if (toStroops(payment.amount) < required) continue;
        return { ok: true, from: payment.from };
      }
      return { ok: false, reason: "matching payment not found" };
    } catch {
      return { ok: false, reason: "horizon unavailable" };
    }
  }
}
