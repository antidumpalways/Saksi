import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { MemoryStore } from "../store/memory";
import { InMemoryReplayStore, type ReplayStore } from "../x402/replay";
import {
  requirementFor,
  type PaymentProof,
  type PaymentVerifier,
  type X402Config,
} from "../x402/types";

const bodySchema = z.object({ invoiceId: z.string().regex(/^[0-9a-f]{64}$/i) }).strict();
const proofSchema = z.object({
  txHash: z.string().regex(/^[0-9a-f]{64}$/i),
});

function paymentRequired(requirement: ReturnType<typeof requirementFor>, error?: string) {
  return {
    x402Version: 1,
    error: error ?? "payment required",
    accepts: [requirement],
  };
}

export function registerX402Routes(
  app: FastifyInstance,
  store: MemoryStore,
  config: X402Config | undefined,
  verifier: PaymentVerifier | undefined,
  replayStore: ReplayStore = new InMemoryReplayStore(),
): void {
  app.post("/v1/x402/risk-report", async (request, reply) => {
    if (!config || !verifier) {
      return reply
        .code(503)
        .send({ error: "X402_NOT_CONFIGURED", message: "x402 is not configured" });
    }
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_BODY", message: "invalid invoice id" });
    }
    const invoiceId = parsed.data.invoiceId.toLowerCase();
    const invoice = store.getInvoice(invoiceId);
    if (!invoice) {
      return reply.code(404).send({ error: "INVOICE_NOT_FOUND", message: "invoice not found" });
    }

    const requirement = requirementFor(config, invoiceId);
    const header = request.headers["x-payment"];
    if (typeof header !== "string" || header.length === 0) {
      return reply.code(402).send(paymentRequired(requirement));
    }

    let proof: PaymentProof;
    try {
      const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as unknown;
      const shape = proofSchema.safeParse(decoded);
      if (!shape.success) {
        return reply.code(402).send(paymentRequired(requirement, "invalid payment proof"));
      }
      proof = { txHash: shape.data.txHash.toLowerCase() };
    } catch {
      return reply.code(402).send(paymentRequired(requirement, "invalid payment proof"));
    }

    const result = await verifier.verify(proof, requirement);
    if (!result.ok) {
      return reply.code(402).send(paymentRequired(requirement, result.reason ?? "payment invalid"));
    }
    const claimed = await replayStore.claim(proof.txHash);
    if (!claimed) {
      return reply.code(409).send({ error: "PAYMENT_REPLAYED", message: "payment already used" });
    }

    const decision = store.getDecision(invoiceId);
    return reply.send({
      paid: { txHash: proof.txHash, from: result.from ?? null },
      report: {
        invoiceId,
        status: invoice.status,
        amount: invoice.amount.toString(),
        discountBps: invoice.discountBps,
        policyHash: invoice.policyHash,
        decisionHash: decision?.decisionHash ?? null,
        memo: decision?.memo ?? null,
      },
    });
  });
}
