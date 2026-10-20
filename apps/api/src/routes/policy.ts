import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { validatePolicy } from "../domain/policy";
import type { Policy } from "../domain/types";
import type { MemoryStore } from "../store/memory";

const positiveIntegerString = z
  .string()
  .regex(/^[1-9]\d*$/, "must be a positive integer string")
  .transform((value) => BigInt(value));

const policyBody = z
  .object({
    maxSingleInvoice: positiveIntegerString,
    maxDebtorExposure: positiveIntegerString,
    minDiscountBps: z.number().int().min(0).max(10_000),
    maxDiscountBps: z.number().int().min(0).max(10_000),
  })
  .strict();

function toJson(policy: Policy) {
  return {
    maxSingleInvoice: policy.maxSingleInvoice.toString(),
    maxDebtorExposure: policy.maxDebtorExposure.toString(),
    minDiscountBps: policy.minDiscountBps,
    maxDiscountBps: policy.maxDiscountBps,
  };
}

export function registerPolicyRoutes(app: FastifyInstance, store: MemoryStore): void {
  app.get("/v1/policy", async (_request, reply) => {
    const policy = store.getPolicy();
    if (!policy) {
      return reply.code(404).send({ error: "POLICY_NOT_SET", message: "policy is not set" });
    }
    return reply.send(toJson(policy));
  });

  app.put("/v1/policy", async (request, reply) => {
    const parsed = policyBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "INVALID_BODY", message: "invalid policy", issues: parsed.error.issues });
    }
    const policy: Policy = parsed.data;
    validatePolicy(policy);
    store.setPolicy(policy);
    return reply.send(toJson(policy));
  });
}
