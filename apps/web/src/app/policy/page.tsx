"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { ApiError, apiGet, apiPut } from "@/lib/api";
import type { Policy } from "@/lib/types";
import { validatePolicyForm } from "@/lib/validate";

export default function PolicyPage() {
  const queryClient = useQueryClient();
  const [maxSingleInvoice, setMaxSingleInvoice] = useState("100000");
  const [maxDebtorExposure, setMaxDebtorExposure] = useState("250000");
  const [minDiscountBps, setMinDiscountBps] = useState("100");
  const [maxDiscountBps, setMaxDiscountBps] = useState("1000");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const policy = useQuery({
    queryKey: ["policy"],
    retry: false,
    queryFn: async () => {
      try {
        return await apiGet<Policy>("policy");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) return null;
        throw cause;
      }
    },
  });

  useEffect(() => {
    if (!policy.data) return;
    setMaxSingleInvoice(policy.data.maxSingleInvoice);
    setMaxDebtorExposure(policy.data.maxDebtorExposure);
    setMinDiscountBps(String(policy.data.minDiscountBps));
    setMaxDiscountBps(String(policy.data.maxDiscountBps));
  }, [policy.data]);

  const save = useMutation({
    mutationFn: () =>
      apiPut<Policy>("policy", {
        maxSingleInvoice,
        maxDebtorExposure,
        minDiscountBps: Number(minDiscountBps),
        maxDiscountBps: Number(maxDiscountBps),
      }),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["policy"] });
      void queryClient.invalidateQueries({ queryKey: ["pool-stats"] });
    },
    onError: (cause) => {
      setSaved(false);
      setError(cause instanceof Error ? cause.message : "request failed");
    },
  });

  const validation = validatePolicyForm({
    maxSingleInvoice,
    maxDebtorExposure,
    minDiscountBps,
    maxDiscountBps,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Risk"
        title="Credit policy"
        description="Hard limits the model cannot cross. Changes apply prospectively to new decisions; existing exposure is not rewritten."
        actions={
          <span className="badge border-mint/40 bg-mint/10 text-mint">
            <ShieldCheck size={12} /> contract mirror planned
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <h2 className="text-sm font-medium">Policy parameters</h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (validation) {
                setError(validation);
                return;
              }
              save.mutate();
            }}
          >
            <Field label="Max single invoice" hint="Atomic units">
              <TextInput
                value={maxSingleInvoice}
                onChange={(event) => setMaxSingleInvoice(event.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="Max debtor exposure" hint="Atomic units per debtor id">
              <TextInput
                value={maxDebtorExposure}
                onChange={(event) => setMaxDebtorExposure(event.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="Min discount bps">
              <TextInput
                value={minDiscountBps}
                onChange={(event) => setMinDiscountBps(event.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="Max discount bps">
              <TextInput
                value={maxDiscountBps}
                onChange={(event) => setMaxDiscountBps(event.target.value)}
                inputMode="numeric"
              />
            </Field>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                variant="primary"
                disabled={save.isPending || Boolean(validation)}
              >
                <Save size={14} />
                {save.isPending ? "Saving…" : "Save policy"}
              </Button>
              {validation ? <p className="mt-2 text-xs text-muted">{validation}</p> : null}
              {error ? (
                <p role="alert" className="mt-2 text-xs text-danger">
                  {error}
                </p>
              ) : null}
              {saved ? (
                <p role="status" className="mt-2 text-xs text-mint">
                  Policy saved.
                </p>
              ) : null}
            </div>
          </form>
        </Card>

        <Card>
          <p className="label">Current policy</p>
          {policy.isLoading ? (
            <p className="mt-3 text-sm text-muted">Loading policy…</p>
          ) : policy.isError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              Could not load policy.
            </p>
          ) : policy.data ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Single cap</dt>
                <dd className="font-mono">{policy.data.maxSingleInvoice}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Debtor cap</dt>
                <dd className="font-mono">{policy.data.maxDebtorExposure}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Band</dt>
                <dd className="font-mono">
                  {policy.data.minDiscountBps}–{policy.data.maxDiscountBps} bps
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">No policy set. Saving creates one.</p>
          )}
          <p className="mt-6 text-[11px] leading-relaxed text-muted">
            The API rejects a single invoice above the single cap and any invoice that would push
            a debtor above the exposure cap. The Soroban contract will repeat these checks once deployed.
          </p>
        </Card>
      </div>
    </div>
  );
}
