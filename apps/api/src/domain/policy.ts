import { DomainError, type Policy } from "./types";

const BPS_DENOMINATOR = 10_000;

export function validatePolicy(policy: Policy): void {
  if (policy.maxSingleInvoice <= 0n) {
    throw new DomainError("INVALID_POLICY", "maxSingleInvoice must be positive");
  }
  if (policy.maxDebtorExposure <= 0n) {
    throw new DomainError("INVALID_POLICY", "maxDebtorExposure must be positive");
  }
  if (policy.maxSingleInvoice > policy.maxDebtorExposure) {
    throw new DomainError(
      "INVALID_POLICY",
      "maxSingleInvoice must not exceed maxDebtorExposure",
    );
  }
  if (
    policy.minDiscountBps < 0 ||
    policy.maxDiscountBps < 0 ||
    policy.minDiscountBps > policy.maxDiscountBps ||
    policy.maxDiscountBps > BPS_DENOMINATOR
  ) {
    throw new DomainError("INVALID_POLICY", "discount band is invalid");
  }
}

export function assertCanRegister(
  policy: Policy,
  currentExposure: bigint,
  amount: bigint,
  discountBps: number,
): void {
  if (amount <= 0n) {
    throw new DomainError("INVALID_AMOUNT", "amount must be positive");
  }
  if (discountBps < policy.minDiscountBps || discountBps > policy.maxDiscountBps) {
    throw new DomainError("DISCOUNT_OUT_OF_BAND", "discount is outside the policy band");
  }
  if (amount > policy.maxSingleInvoice) {
    throw new DomainError(
      "SINGLE_INVOICE_CAP_EXCEEDED",
      "amount exceeds the single-invoice cap",
    );
  }
  const next = currentExposure + amount;
  if (next > policy.maxDebtorExposure) {
    throw new DomainError(
      "DEBTOR_EXPOSURE_EXCEEDED",
      "debtor exposure would exceed the policy cap",
    );
  }
}

export function releaseExposure(current: bigint, amount: bigint): bigint {
  if (current < amount) {
    throw new DomainError("EXPOSURE_UNDERFLOW", "exposure accounting underflow");
  }
  return current - amount;
}
