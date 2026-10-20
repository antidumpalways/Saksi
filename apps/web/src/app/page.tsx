"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FilePlus2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { InvoiceTable, PageHeader, Stat } from "@/components/page";
import { Card } from "@/components/ui";
import { apiGet } from "@/lib/api";
import type { InvoiceList, PoolStats } from "@/lib/types";

export default function OverviewPage() {
  const stats = useQuery({
    queryKey: ["pool-stats"],
    queryFn: () => apiGet<PoolStats>("pool/stats"),
  });
  const invoices = useQuery({
    queryKey: ["invoices"],
    queryFn: () => apiGet<InvoiceList>("invoices"),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Credit desk overview"
        description="Policy-bounded underwriting for RWA lenders. The AI proposes; the policy decides; every decision can be anchored."
        actions={
          <Link href="/invoices" className="btn btn-primary">
            <FilePlus2 size={16} />
            Register invoice
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Stat
          label="Total exposure"
          value={stats.data?.totalExposure ?? "—"}
          detail="Atomic units reserved under policy"
        />
        <Stat
          label="Invoices"
          value={String(stats.data?.invoiceCount ?? "—")}
          detail="Registered in this instance"
        />
        <Stat
          label="Approved"
          value={String(stats.data?.approvedCount ?? "—")}
          detail="Decisions with approval"
        />
        <Stat
          label="Hashed"
          value={String(stats.data?.verifiedCount ?? "—")}
          detail="Decisions with a memo hash"
        />
      </div>

      {stats.isError ? (
        <Card className="mt-4 border-danger/40">
          <p role="alert" className="text-sm text-danger">
            API unavailable. Start the API and set SAKSI_API_KEY in the web env.
          </p>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent invoices</h2>
            <Link href="/invoices" className="text-xs text-muted hover:text-mint">
              Open ledger <ArrowUpRight size={12} className="inline" />
            </Link>
          </div>
          {invoices.isLoading ? (
            <Card>
              <p className="text-sm text-muted">Loading invoices…</p>
            </Card>
          ) : invoices.isError ? (
            <Card className="border-danger/40">
              <p role="alert" className="text-sm text-danger">
                Could not load invoices.
              </p>
            </Card>
          ) : (
            <InvoiceTable invoices={invoices.data?.invoices.slice(0, 6) ?? []} />
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-mint" />
              <h2 className="text-sm font-medium">Policy snapshot</h2>
            </div>
            {stats.data?.policy ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Single invoice cap</dt>
                  <dd className="font-mono">{stats.data.policy.maxSingleInvoice}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Debtor exposure cap</dt>
                  <dd className="font-mono">{stats.data.policy.maxDebtorExposure}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Discount band</dt>
                  <dd className="font-mono">
                    {stats.data.policy.minDiscountBps}–{stats.data.policy.maxDiscountBps} bps
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">No policy set yet.</p>
            )}
            <Link href="/policy" className="btn mt-4 w-full">
              Manage policy
            </Link>
          </Card>

          <Card>
            <p className="label">Operating rule</p>
            <p className="mt-2 text-sm text-muted">
              The model can propose a decision. It cannot exceed the cap. Rejections are
              attestable too.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
