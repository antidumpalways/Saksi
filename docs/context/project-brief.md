# Saksi — Project Brief (session memory)

Baca file ini bersama `AGENTS.md` setiap sesi baru. Ini merangkum keputusan, batasan, dan status terakhir.

## Tujuan

- Membangun **Saksi**: policy, underwriting, dan attestation layer untuk RWA lender di Stellar.
- Target grant: **SCF Build, Open Track**, nominal realistis **$60k–$80k** (bukan langsung $150k).
- Applicant: abang pengguna (18+), email `akusiapasij252@gmail.com`.
- Deadline ronde: **SCF #46, 8 November 2026**. Interest form dulu, lalu diundang submit.

## Posisi produk

- **Bukan** marketplace invoice financing.
- **Bukan** pesaing Airswift, Bunkr, Pelago, atau Agama.
- Saksi adalah lapisan yang mereka integrasikan: risk API, policy engine deterministik, attestation Soroban, x402 risk report, MCP server.
- Lender tetap pegang lisensi, KYC, dana, dan collection.
- Tidak ada kustodi dana. Tidak ada pinjaman.

## Batasan keras

1. **Tidak menyalin** kode, UI, teks, aset, nama, atau branding Faktura atau proyek lain. Ide umum dan standar publik boleh.
2. **Tidak ada klaim traction palsu.** Belum ada user/TVL; tulis pre-launch.
3. **Tidak memakai crypto sebagai alat bayar di Indonesia.** IDR tetap untuk user; USDC/XLM hanya backend settlement/audit.
4. **Applicant 18+.** Minor boleh bantu, bukan applicant/KYC.
5. Semua klaim butuh bukti: file, command, tx hash, URL.

## Stack

- Monorepo: pnpm + turborepo
- Web: Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui, TanStack Query
- API: Fastify, zod, Drizzle, PostgreSQL, Redis
- Contracts: Rust, soroban-sdk, stellar-cli
- Risk: TypeScript/Python, schema-validated LLM
- x402: HTTP 402 + verifikasi USDC Stellar
- MCP: @modelcontextprotocol/sdk
- Infra: GitHub Actions, Vercel, Fly.io/Railway, Sentry

## Struktur repo saat ini

- `opencode.json` — default agent `orchestrator`
- `AGENTS.md` — invariant, stack, aturan
- `.opencode/agent/` — orchestrator, builder, contracts-reviewer, stellar-integration-reviewer, security-auditor, frontend-reviewer, qa-validator, scf-reviewer, arbiter
- `.opencode/command/` — `/validate`, `/gate`, `/handoff`
- `docs/agents/` — validation protocol, quality gates G1–G8, handoff contract, validation log
- `docs/architecture/overview.md` — boundary dan data flow
- `docs/context/project-brief.md` — file ini

## Alur validasi

`builder` → `contracts-reviewer` + `security-auditor` → `stellar-integration-reviewer` + `scf-reviewer` → `qa-validator` → `arbiter` (jika beda pendapat) → `orchestrator` sign-off.

Aturan: no self-approval, minimal 2 reviewer independen, evidence wajib, HIGH/BLOCKER memblokir, maksimal 3 siklus lalu eskalasi ke manusia.

## Fakta SCF yang sudah diverifikasi

- SCF v7.0 punya 3 track: Open, Integration, RFP.
- Build Award maksimum $150.000 XLM; pencairan 10/20/30/40.
- SCF #46 submit deadline 8 Nov 2026; panel 11–18 Nov; community vote 23 Nov–3 Des.
- **18+** adalah syarat Eligible Individual.
- Referral sangat membantu: 22 dari 29 pemenang #43 berasal dari referral.
- RFP Q4 2026 belum dibuka saat brief ini ditulis.
- Pemenang terdekat: Airswift (SCF-funded, tokenized receivables), Bunkr (freight receivables), Pelago (supply chain finance), Agama (private credit RWA).

## Status terakhir

- Scaffolding repo dan sistem agent selesai.
- **Scope 001 selesai:** kontrak Soroban policy + attestation, 25 tes, clippy clean, wasm hash `2d31139659d3bb988a946f7415b27978f2b2835ebf48c4f78e540d2c88fc16a3`.
- **Scope 002 selesai:** API skeleton Fastify + policy engine + canonical memo + API key auth, 20 tes, typecheck clean.
- **Scope 003 selesai:** x402 exact payment + Stellar Horizon verifier + durable replay + MCP server 6 tools, 28 tes API, typecheck API/MCP clean.
- **Scope 004 selesai:** web UI Next.js (dashboard, invoices, detail/decision, policy) + Basic auth + server-side API proxy, build & typecheck pass.
- Belum ada website publik, demo video, atau tx testnet.
- Interest form belum disubmit.
- Validasi lengkap ada di `docs/agents/validation-log.md`.

## Langkah berikutnya

1. Deploy kontrak ke Stellar testnet; catat tx hash dan contract ID.
2. Sambungkan UI ke kontrak untuk attestation nyata (tx hash link).
3. Deploy web + API ke host publik; bikin landing page.
4. Rekam demo video dan isi SCF interest form.
5. Cari referral dari `@Indo_Stellar` sebelum submit.

## Cara melanjutkan sesi baru

Katakan: "Baca `AGENTS.md` dan `docs/context/project-brief.md`, lalu lanjutkan dari langkah berikutnya." Jangan mulai dari nol.
