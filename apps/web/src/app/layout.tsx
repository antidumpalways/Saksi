import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saksi — policy and attestation for RWA credit",
  description:
    "Policy-bounded underwriting with decision hashes ready to anchor for Stellar RWA lenders.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          <div className="mx-auto min-h-screen max-w-[1400px]">
            <MobileNav />
            <div className="flex">
              <Sidebar />
              <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
