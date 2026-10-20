"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { InvoiceTable, PageHeader } from "@/components/page";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";
import type { Invoice, InvoiceList } from "@/lib/types";
import { validateInvoiceForm } from "@/lib/validate";

function randomHex(bytes: number) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [invoiceId, setInvoiceId] = useState("");
  const [debtor, setDebtor] = useState("debtor-alpha");
  const [amount, setAmount] = useState("50000");
  const [discountBps, setDiscountBps] = useState("300");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInvoiceId(randomHex(32));
  }, []);

  const validation = validateInvoiceForm({ invoiceId, debtor, amount, discountBps });

  const invoices = useQuery({
    queryKey: ["invoices"],
    queryFn: () => apiGet<InvoiceList>("invoices"),
  });

  const create = useMutation({
    mutationFn: () =>
      apiPost<Invoice>("invoices", {
        invoiceId,
        debtor,
        amount,
        discountBps: Number(discountBps),
      }),
    onSuccess: () => {
      setError(null);
      setInvoiceId(randomHex(32));
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["pool-stats"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "request failed"),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Ledger"
        title="Invoices"
        description="Register receivables against the active policy. Duplicate ids, cap breaches, and discount-band violations are rejected by the API."
      />

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card>
          <h2 className="text-sm font-medium">Register invoice</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (validation) {
                setError(validation);
                return;
              }
              create.mutate();
            }}
          >
            <Field label="Invoice id" hint="64 hex characters">
              <div className="flex gap-2">
                <TextInput
                  value={invoiceId}
                  onChange={(event) => setInvoiceId(event.target.value)}
                  spellCheck={false}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={() => setInvoiceId(randomHex(32))}
                  title="Generate id"
                  aria-label="Generate invoice id"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            </Field>
            <Field label="Debtor id" hint="Lowercase slug, e.g. debtor-alpha">
              <TextInput
                value={debtor}
                onChange={(event) => setDebtor(event.target.value)}
                spellCheck={false}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount" hint="Atomic units">
                <TextInput
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Discount bps">
                <TextInput
                  value={discountBps}
                  onChange={(event) => setDiscountBps(event.target.value)}
                  inputMode="numeric"
                />
              </Field>
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={create.isPending || Boolean(validation)}
            >
              <Send size={14} />
              {create.isPending ? "Registering…" : "Register"}
            </Button>
            {validation ? <p className="text-xs text-muted">{validation}</p> : null}
            {error ? (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            ) : null}
            {create.data ? (
              <p className="text-xs text-mint">
                Registered {create.data.id.slice(0, 12)}… at {create.data.amount}.
              </p>
            ) : null}
          </form>
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">All invoices</h2>
            <span className="text-xs text-muted">
              {invoices.isLoading ? "loading…" : `${invoices.data?.invoices.length ?? 0} records`}
            </span>
          </div>
          {invoices.isError ? (
            <Card className="border-danger/40">
              <p role="alert" className="text-sm text-danger">
                Could not load invoices. Check the API and proxy env.
              </p>
            </Card>
          ) : (
            <InvoiceTable invoices={invoices.data?.invoices ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}
