import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SaksiClient } from "./client";

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const body =
    error instanceof Error && "body" in error ? (error as { body: unknown }).body : undefined;
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: message, body }),
      },
    ],
    isError: true,
  };
}

export function registerSaksiTools(server: McpServer, client: SaksiClient): void {
  server.registerTool(
    "pool_stats",
    { description: "Get Saksi policy and aggregate exposure stats", inputSchema: {} },
    async () => {
      try {
        return text(await client.get("/v1/pool/stats"));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "submit_invoice",
    {
      description: "Register an invoice for underwriting",
      inputSchema: {
        invoiceId: z.string().regex(/^[0-9a-f]{64}$/i),
        debtor: z.string(),
        amount: z.string(),
        discountBps: z.number().int(),
      },
    },
    async (args) => {
      try {
        return text(
          await client.post("/v1/invoices", {
            invoiceId: args.invoiceId,
            debtor: args.debtor,
            amount: args.amount,
            discountBps: args.discountBps,
          }),
        );
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "get_risk_report",
    {
      description: "Get the anchored decision and memo for an invoice",
      inputSchema: { invoiceId: z.string().regex(/^[0-9a-f]{64}$/i) },
    },
    async (args) => {
      try {
        return text(await client.get(`/v1/decisions/${encodeURIComponent(String(args.invoiceId))}`));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "list_funded_invoices",
    { description: "List approved invoices", inputSchema: {} },
    async () => {
      try {
        return text(await client.get("/v1/invoices?status=approved"));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "list_verified_invoices",
    { description: "List approved invoices with anchored decisions", inputSchema: {} },
    async () => {
      try {
        const result = await client.get<{ invoices?: Array<{ decisionHash?: string | null }> }>(
          "/v1/invoices?status=approved",
        );
        const invoices = (result.invoices ?? []).filter((invoice) => invoice.decisionHash);
        return text({ invoices });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "verify_decision_hash",
    {
      description: "Compare an expected decision hash with the stored decision",
      inputSchema: {
        invoiceId: z.string().regex(/^[0-9a-f]{64}$/i),
        expectedHash: z.string().regex(/^[0-9a-f]{64}$/i),
      },
    },
    async (args) => {
      try {
        const decision = await client.get<{ decisionHash?: string }>(
          `/v1/decisions/${encodeURIComponent(String(args.invoiceId))}`,
        );
        return text({
          invoiceId: args.invoiceId,
          matched: decision.decisionHash?.toLowerCase() === String(args.expectedHash).toLowerCase(),
          storedHash: decision.decisionHash ?? null,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );
}
