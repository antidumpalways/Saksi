import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { policyHash } from "../domain/memo";
import { assertCanRegister } from "../domain/policy";
import { DomainError, type Invoice } from "../domain/types";
import type { MemoryStore } from "../store/memory";

const invoiceId = z.string().regex(/^[0-9a-f]{64}$/i, "must be 64 hex characters");
const amount = z
  .string()
  .max(78, "amount is too large")
  .regex(/^[1-9]\d*$/, "must be a positive integer string")
  .transform((value) => BigInt(value));

const createInvoiceBody = z
  .object({
    invoiceId,
    debtor: z
      .string()
      .regex(/^[a-z0-9][a-z0-9_-]{0,127}$/, "must be a lowercase debtor id"),
    amount,
    discountBps: z.number().int().min(0).max(10_000),
  })
  .strict();

function toJson(invoice: Invoice) {
  return {
    id: invoice.id,
    debtor: invoice.debtor,
    amount: invoice.amount.toString(),
    discountBps: invoice.discountBps,
    status: invoice.status,
    decisionHash: invoice.decisionHash ?? null,
    approved: invoice.approved ?? null,
    createdAt: invoice.createdAt,
  };
}

export function registerInvoiceRoutes(app: FastifyInstance, store: MemoryStore): void {
  app.post("/v1/invoices", async (request, reply) => {
    const parsed = createInvoiceBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "INVALID_BODY", message: "invalid invoice", issues: parsed.error.issues });
    }
    const input = parsed.data;
    const id = input.invoiceId.toLowerCase();
    const policy = store.getPolicy();
    if (!policy) {
      throw new DomainError("POLICY_NOT_SET", "policy is not set", 409);
    }
    if (store.hasInvoice(id) || store.getDecision(id)) {
      throw new DomainError("INVOICE_EXISTS", "invoice already exists", 409);
    }

    const currentExposure = store.getExposure(input.debtor);
    assertCanRegister(policy, currentExposure, input.amount, input.discountBps);

    const invoice: Invoice = {
      id,
      debtor: input.debtor,
      amount: input.amount,
      discountBps: input.discountBps,
      status: "registered",
      policyHash: policyHash(policy),
      createdAt: new Date().toISOString(),
    };
    store.putInvoice(invoice);
    store.setExposure(invoice.debtor, currentExposure + invoice.amount);
    return reply.code(201).send(toJson(invoice));
  });

  app.get<{ Params: { invoiceId: string } }>(
    "/v1/invoices/:invoiceId",
    async (request, reply) => {
      const invoice = store.getInvoice(request.params.invoiceId.toLowerCase());
      if (!invoice) {
        return reply.code(404).send({ error: "INVOICE_NOT_FOUND", message: "invoice not found" });
      }
      return reply.send(toJson(invoice));
    },
  );

  app.get<{ Querystring: { status?: string } }>("/v1/invoices", async (request, reply) => {
    const status = request.query.status;
    const invoices = store.listInvoices().filter((invoice) => !status || invoice.status === status);
    return reply.send({ invoices: invoices.map(toJson) });
  });

  app.get("/v1/pool/stats", async (_request, reply) => {
    const policy = store.getPolicy();
    const invoices = store.listInvoices();
    const approved = invoices.filter((invoice) => invoice.status === "approved");
    return reply.send({
      policy: policy
        ? {
            maxSingleInvoice: policy.maxSingleInvoice.toString(),
            maxDebtorExposure: policy.maxDebtorExposure.toString(),
            minDiscountBps: policy.minDiscountBps,
            maxDiscountBps: policy.maxDiscountBps,
          }
        : null,
      totalExposure: store.totalExposure().toString(),
      invoiceCount: invoices.length,
      approvedCount: approved.length,
      verifiedCount: approved.filter((invoice) => invoice.decisionHash).length,
    });
  });

  app.get<{ Params: { debtor: string } }>(
    "/v1/exposure/:debtor",
    async (request, reply) => {
      if (!/^[a-z0-9][a-z0-9_-]{0,127}$/.test(request.params.debtor)) {
        return reply.code(400).send({ error: "INVALID_DEBTOR", message: "invalid debtor id" });
      }
      return reply.send({
        debtor: request.params.debtor,
        exposure: store.getExposure(request.params.debtor).toString(),
      });
    },
  );
}
