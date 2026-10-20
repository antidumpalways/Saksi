"use client";

import { FileText, LayoutDashboard, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line/80 bg-ink/90 px-4 py-3 backdrop-blur md:hidden">
      <Link href="/" className="text-sm font-semibold tracking-[0.22em]">
        SAKSI
      </Link>
      <nav className="flex items-center gap-4 text-xs text-muted">
        <Link href="/" className="hover:text-mint" aria-label="Overview" aria-current={active("/") ? "page" : undefined}>
          <LayoutDashboard size={16} />
        </Link>
        <Link href="/invoices" className="hover:text-mint" aria-label="Invoices" aria-current={active("/invoices") ? "page" : undefined}>
          <FileText size={16} />
        </Link>
        <Link href="/policy" className="hover:text-mint" aria-label="Policy" aria-current={active("/policy") ? "page" : undefined}>
          <ShieldCheck size={16} />
        </Link>
      </nav>
    </div>
  );
}
