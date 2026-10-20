import { createHash } from "node:crypto";
import type { Policy } from "./types";

export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite number");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const body = entries
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalize(nested)}`)
      .join(",");
    return `{${body}}`;
  }
  throw new Error(`cannot canonicalize ${typeof value}`);
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function policyHash(policy: Policy): string {
  return sha256Hex(
    canonicalize({
      maxSingleInvoice: policy.maxSingleInvoice.toString(),
      maxDebtorExposure: policy.maxDebtorExposure.toString(),
      minDiscountBps: policy.minDiscountBps,
      maxDiscountBps: policy.maxDiscountBps,
    }),
  );
}

export interface DecisionMemoInput {
  invoiceId: string;
  debtor: string;
  amount: bigint;
  discountBps: number;
  policyHash: string;
  approved: boolean;
  score: number;
  priceBps: number;
  model: string;
  promptHash: string;
  inputsHash: string;
  nonce: string;
  createdAt: string;
}

export function buildDecisionMemo(input: DecisionMemoInput): Record<string, unknown> {
  return {
    version: "saksi.decision.v1",
    invoice_id: input.invoiceId,
    debtor: input.debtor,
    amount: input.amount.toString(),
    discount_bps: input.discountBps,
    policy_hash: input.policyHash,
    decision: input.approved ? "approve" : "reject",
    score: input.score,
    price_bps: input.priceBps,
    model: input.model,
    prompt_hash: input.promptHash,
    inputs_hash: input.inputsHash,
    nonce: input.nonce,
    created_at: input.createdAt,
  };
}

export function hashDecisionMemo(memo: Record<string, unknown>): string {
  return sha256Hex(canonicalize(memo));
}
