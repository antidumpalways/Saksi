"use client";

import {
  Activity,
  BookOpenCheck,
  FileText,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/policy", label: "Policy", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-line/80 px-4 py-6 md:block">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-lg border border-mint/30 bg-mint/10 text-mint">
          <BookOpenCheck size={18} />
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-[0.22em]">SAKSI</span>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-muted">
            credit policy layer
          </span>
        </span>
      </Link>

      <nav className="mt-8 space-y-1">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "border border-mint/30 bg-mint/10 text-mint"
                  : "text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 rounded-lg border border-line/70 p-3">
        <p className="label">Target network</p>
        <p className="mt-1 flex items-center gap-2 text-xs">
          <span className="size-1.5 rounded-full bg-mint" />
          Stellar testnet (pre-deployment)
        </p>
        <p className="mt-3 label">Status</p>
        <p className="mt-1 text-xs text-muted">Hashes ready. No custody.</p>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[11px] text-muted">
        <Activity size={12} />
        Decision hashes ready to anchor
      </div>
    </aside>
  );
}
