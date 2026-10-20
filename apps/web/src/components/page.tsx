import Link from "next/link";
import type { ReactNode } from "react";
import type { Invoice } from "@/lib/types";
import { Card, Hash, StatusBadge } from "./ui";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="label">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {actions}
    </header>
  );
}

export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <p className="label">{label}</p>
      <p className="mt-2 font-mono text-2xl text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </Card>
  );
}

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">
          No invoices yet. Register one to exercise the policy engine.
        </p>
      </Card>
    );
  }
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line/80 text-[11px] uppercase tracking-[0.16em] text-muted">
          <tr>
            <th className="px-5 py-3 font-normal">Invoice</th>
            <th className="px-5 py-3 font-normal">Debtor</th>
            <th className="px-5 py-3 text-right font-normal">Amount</th>
            <th className="px-5 py-3 text-right font-normal">Discount</th>
            <th className="px-5 py-3 font-normal">Status</th>
            <th className="px-5 py-3 font-normal">Decision</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-line/50 last:border-0">
              <td className="px-5 py-3">
                <Link href={`/invoices/${invoice.id}`} className="hash hover:text-mint">
                  {invoice.id.slice(0, 12)}…
                </Link>
              </td>
              <td className="px-5 py-3 text-white">{invoice.debtor}</td>
              <td className="px-5 py-3 text-right font-mono">{invoice.amount}</td>
              <td className="px-5 py-3 text-right font-mono">{invoice.discountBps} bps</td>
              <td className="px-5 py-3">
                <StatusBadge status={invoice.status} />
              </td>
              <td className="px-5 py-3">
                <Hash value={invoice.decisionHash} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
