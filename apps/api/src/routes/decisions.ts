import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildDecisionMemo, hashDecisionMemo, policyHash } from "../domain/memo";
import { assertCanRegister, releaseExposure } from "../domain/policy";
import { DomainError } from "../domain/types";
import type { MemoryStore } from "../store/memory";

const invoiceId = z.string().regex(/^[0-9a-f]{64}$/i, "must be 64 hex characters");
const hashHex = z.string().regex(/^[0-9a-f]{64}$/i, "must be 64 hex characters");

const decideBody = z
  .object({
    invoiceId,
    approved: z.boolean(),
    score: z.number().int().min(0).max(100),
    priceBps: z.number().int().min(0).max(10_000),
    model: z.string().min(1).max(128),
    promptHash: hashHex,
    inputsHash: hashHex,
    nonce: z.string().min(8).max(128),
  })
  .strict();

export function registerDecisionRoutes(app: FastifyInstance, store: MemoryStore): void {
  app.post("/v1/decisions", async (request, reply) => {
    const parsed = decideBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "INVALID_BODY", message: "invalid decision", issues: parsed.error.issues });
    }
    const input = parsed.data;
    const id = input.invoiceId.toLowerCase();
    const invoice = store.getInvoice(id);
    if (!invoice) {
      throw new DomainError("INVOICE_NOT_FOUND", "invoice not found", 404);
    }
    if (store.getDecision(id)) {
      throw new DomainError("ALREADY_ATTESTED", "invoice already has a decision", 409);
    }
    const policy = store.getPolicy();
    if (!policy) {
      throw new DomainError("POLICY_NOT_SET", "policy is not set", 409);
    }
    if (store.hasNonce(input.nonce)) {
      throw new DomainError("NONCE_REUSED", "nonce already used", 409);
    }

    if (input.approved) {
      const exposureBefore = store.getExposure(invoice.debtor) - invoice.amount;
      assertCanRegister(policy, exposureBefore, invoice.amount, invoice.discountBps);
    }

    const createdAt = new Date().toISOString();
    const memo = buildDecisionMemo({
      invoiceId: invoice.id,
      debtor: invoice.debtor,
      amount: invoice.amount,
      discountBps: invoice.discountBps,
      policyHash: policyHash(policy),
      approved: input.approved,
      score: input.score,
      priceBps: input.priceBps,
      model: input.model,
      promptHash: input.promptHash.toLowerCase(),
      inputsHash: input.inputsHash.toLowerCase(),
      nonce: input.nonce,
      createdAt,
    });
    const decisionHash = hashDecisionMemo(memo);

    const existingInvoice = store.findInvoiceByDecisionHash(decisionHash);
    if (existingInvoice !== undefined) {
      throw new DomainError("DECISION_HASH_REUSED", "decision hash already used", 409);
    }

    store.putNonce(input.nonce);
    store.putDecision({ invoiceId: id, decisionHash, approved: input.approved, memo, createdAt });

    if (input.approved) {
      invoice.status = "approved";
    } else {
      invoice.status = "rejected";
      store.setExposure(
        invoice.debtor,
        releaseExposure(store.getExposure(invoice.debtor), invoice.amount),
      );
    }
    invoice.decisionHash = decisionHash;
    invoice.approved = input.approved;
    store.putInvoice(invoice);

    return reply.code(201).send({
      invoiceId: id,
      decisionHash,
      approved: input.approved,
      memo,
    });
  });

  app.get<{ Params: { invoiceId: string } }>(
    "/v1/decisions/:invoiceId",
    async (request, reply) => {
      const record = store.getDecision(request.params.invoiceId.toLowerCase());
      if (!record) {
        return reply.code(404).send({ error: "DECISION_NOT_FOUND", message: "decision not found" });
      }
      return reply.send(record);
    },
  );
}
