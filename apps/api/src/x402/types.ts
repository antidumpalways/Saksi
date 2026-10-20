import { createHash } from "node:crypto";

export interface X402Config {
  network: string;
  payTo: string;
  asset: string;
  /** Atomic units of the asset, e.g. 10000000 for 1 USDC with 7 decimals. */
  amount: string;
  resource: string;
  horizonUrl: string;
  maxTimeoutSeconds: number;
}

export interface PaymentRequirement {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: { memo: string; invoiceId: string };
}

export interface PaymentProof {
  txHash: string;
}

export interface PaymentVerification {
  ok: boolean;
  reason?: string;
  from?: string;
}

export interface PaymentVerifier {
  verify(proof: PaymentProof, requirement: PaymentRequirement): Promise<PaymentVerification>;
}

export function requirementFor(config: X402Config, invoiceId: string): PaymentRequirement {
  return {
    scheme: "exact",
    network: config.network,
    maxAmountRequired: config.amount,
    resource: config.resource,
    description: "Saksi risk report",
    mimeType: "application/json",
    payTo: config.payTo,
    maxTimeoutSeconds: config.maxTimeoutSeconds,
    asset: config.asset,
    extra: {
      memo: `saksi:${createHash("sha256").update(invoiceId).digest("hex").slice(0, 22)}`,
      invoiceId,
    },
  };
}
