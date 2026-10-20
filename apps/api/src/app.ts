import { createHash, timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { DomainError } from "./domain/types";
import { registerDecisionRoutes } from "./routes/decisions";
import { registerHealthRoutes } from "./routes/health";
import { registerInvoiceRoutes } from "./routes/invoices";
import { registerPolicyRoutes } from "./routes/policy";
import { registerX402Routes } from "./routes/x402";
import { MemoryStore } from "./store/memory";
import type { ReplayStore } from "./x402/replay";
import type { PaymentVerifier, X402Config } from "./x402/types";

export interface AppOptions {
  store?: MemoryStore;
  apiKey?: string;
  x402?: X402Config;
  paymentVerifier?: PaymentVerifier;
  replayStore?: ReplayStore;
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const store = options.store ?? new MemoryStore();
  const apiKey = options.apiKey ?? process.env.SAKSI_API_KEY;
  if (!apiKey) {
    throw new Error("SAKSI_API_KEY is required");
  }

  const app = Fastify({ logger: false });
  const apiKeyDigest = createHash("sha256").update(apiKey).digest();

  app.addHook("preHandler", async (request, reply) => {
    const route = request.routeOptions.url ?? "";
    if (route === "/health" || route.startsWith("/v1/x402/")) {
      return;
    }
    const provided = request.headers["x-api-key"];
    if (typeof provided !== "string") {
      return reply.code(401).send({ error: "UNAUTHORIZED", message: "missing or invalid API key" });
    }
    const providedDigest = createHash("sha256").update(provided).digest();
    if (!timingSafeEqual(providedDigest, apiKeyDigest)) {
      return reply.code(401).send({ error: "UNAUTHORIZED", message: "missing or invalid API key" });
    }
  });

  registerHealthRoutes(app);
  registerPolicyRoutes(app, store);
  registerInvoiceRoutes(app, store);
  registerDecisionRoutes(app, store);
  registerX402Routes(
    app,
    store,
    options.x402,
    options.paymentVerifier,
    options.replayStore,
  );

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError) {
      return reply.code(error.statusCode).send({ error: error.code, message: error.message });
    }
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "INVALID_BODY", message: "invalid body" });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "INTERNAL", message: "internal error" });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ error: "NOT_FOUND", message: "route not found" });
  });

  return app;
}
