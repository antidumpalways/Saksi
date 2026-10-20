"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Field, Hash, StatusBadge, TextInput } from "@/components/ui";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { Decision, Invoice } from "@/lib/types";
import { validateDecisionForm } from "@/lib/validate";

function randomHex(bytes: number) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const queryClient = useQueryClient();

  const [approved, setApproved] = useState(true);
  const [score, setScore] = useState("82");
  const [priceBps, setPriceBps] = useState("250");
  const [model, setModel] = useState("saksi-demo/underwriter-v1");
  const [promptHash, setPromptHash] = useState("");
  const [inputsHash, setInputsHash] = useState("");
  const [nonce, setNonce] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPromptHash(randomHex(32));
    setInputsHash(randomHex(32));
    setNonce(randomHex(8));
  }, []);

  const validation = validateDecisionForm({
    score,
    priceBps,
    promptHash,
    inputsHash,
    nonce,
  });

  const invoice = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => apiGet<Invoice>(`invoices/${invoiceId}`),
  });

  const decision = useQuery({
    queryKey: ["decision", invoiceId],
    retry: false,
    queryFn: async () => {
      try {
        return await apiGet<Decision>(`decisions/${invoiceId}`);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) return null;
        throw cause;
      }
    },
  });

  const decide = useMutation({
    mutationFn: () =>
      apiPost<{ decisionHash: string; approved: boolean; memo: Record<string, unknown> }>(
        "decisions",
        {
          invoiceId,
          approved,
          score: Number(score),
          priceBps: Number(priceBps),
          model,
          promptHash,
          inputsHash,
          nonce,
        },
      ),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      void queryClient.invalidateQueries({ queryKey: ["decision", invoiceId] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["pool-stats"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "request failed"),
  });

  if (invoice.isLoading) {
    return <Card>Loading invoice…</Card>;
  }
  if (invoice.isError || !invoice.data) {
    const notFound = invoice.error instanceof ApiError && invoice.error.status === 404;
    return (
      <Card>
        <p role="alert" className="text-sm text-danger">
          {notFound ? "Invoice not found." : "Could not load invoice. Check the API and retry."}
        </p>
        <Link href="/invoices" className="btn mt-4">
          Back to ledger
        </Link>
      </Card>
    );
  }

  const item = invoice.data;
  const currentDecision = decision.data ?? null;

  return (
    <div>
      <Link href="/invoices" className="mb-4 inline-flex items-center gap-2 text-xs text-muted hover:text-mint">
        <ArrowLeft size={14} /> Back to ledger
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label">Invoice</p>
          <h1 className="mt-2 font-mono text-lg text-white">{item.id}</h1>
          <div className="mt-3 flex items-center gap-2">
            <StatusBadge status={item.status} />
            <span className="text-xs text-muted">Debtor {item.debtor}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="label">Amount</p>
          <p className="mt-1 font-mono text-2xl">{item.amount}</p>
          <p className="text-xs text-muted">{item.discountBps} bps discount</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-medium">Decision receipt</h2>
            {decision.isLoading ? (
              <p className="mt-3 text-sm text-muted">Loading decision…</p>
            ) : decision.isError ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                Could not load decision.
              </p>
            ) : currentDecision ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted">Status</span>
                  <span className={currentDecision.approved ? "text-mint" : "text-danger"}>
                    {currentDecision.approved ? "approved" : "rejected"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted">Decision hash</span>
                  <span className="font-mono text-xs">{currentDecision.decisionHash}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted">Recorded</span>
                  <span className="text-xs">{currentDecision.createdAt}</span>
                </div>
                <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-line/70 bg-ink/70 p-3 text-[11px] leading-relaxed text-muted">
                  {JSON.stringify(currentDecision.memo, null, 2)}
                </pre>
                <p className="text-[11px] text-muted">
                  The memo hash is ready for Soroban attestation. This UI does not submit a
                  transaction yet.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No decision recorded for this invoice.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-medium">Receipt data</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="label">Invoice id</dt>
                <dd className="mt-1">
                  <Hash value={item.id} />
                </dd>
              </div>
              <div>
                <dt className="label">Decision hash</dt>
                <dd className="mt-1">
                  <Hash value={item.decisionHash} />
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              The memo binds invoice, debtor, amount, discount, policy hash, model inputs, and
              nonce. The decision hash is ready to anchor on Soroban.
            </p>
          </Card>
        </div>

        <Card>
          <h2 className="text-sm font-medium">Record decision</h2>
          <p className="mt-1 text-xs text-muted">
            Manual demo entry. No model runs in this UI. Approval keeps exposure; rejection
            releases it.
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (validation) {
                setError(validation);
                return;
              }
              decide.mutate();
            }}
          >
            <Field label="Decision">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={approved ? "primary" : "default"}
                  onClick={() => setApproved(true)}
                  aria-pressed={approved}
                >
                  <Check size={14} /> Approve
                </Button>
                <Button
                  type="button"
                  variant={!approved ? "primary" : "default"}
                  onClick={() => setApproved(false)}
                  aria-pressed={!approved}
                >
                  <X size={14} /> Reject
                </Button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Score">
                <TextInput value={score} onChange={(event) => setScore(event.target.value)} />
              </Field>
              <Field label="Price bps">
                <TextInput value={priceBps} onChange={(event) => setPriceBps(event.target.value)} />
              </Field>
            </div>
            <Field label="Model">
              <TextInput value={model} onChange={(event) => setModel(event.target.value)} />
            </Field>
            <Field label="Prompt hash" hint="64 hex">
              <TextInput
                value={promptHash}
                onChange={(event) => setPromptHash(event.target.value)}
                className="font-mono text-[11px]"
              />
            </Field>
            <Field label="Inputs hash" hint="64 hex">
              <TextInput
                value={inputsHash}
                onChange={(event) => setInputsHash(event.target.value)}
                className="font-mono text-[11px]"
              />
            </Field>
            <Field label="Nonce" hint="Unique per decision">
              <div className="flex gap-2">
                <TextInput
                  value={nonce}
                  onChange={(event) => setNonce(event.target.value)}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={() => setNonce(randomHex(8))}
                  aria-label="Generate nonce"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            </Field>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={
                decide.isPending || Boolean(currentDecision) || Boolean(validation)
              }
            >
              {currentDecision
                ? "Decision already recorded"
                : decide.isPending
                  ? "Recording…"
                  : "Record decision"}
            </Button>
            {validation ? <p className="text-xs text-muted">{validation}</p> : null}
            {error ? (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            ) : null}
            {decide.data ? (
              <p className="break-all text-[11px] text-mint">
                Hash {decide.data.decisionHash}
              </p>
            ) : null}
          </form>
        </Card>
      </div>
    </div>
  );
}
