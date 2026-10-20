Saksi API skeleton.

- POST /v1/invoices
- POST /v1/decisions
- GET /v1/invoices/:invoiceId
- GET /v1/policy
- PUT /v1/policy
- GET /health

No custody, no lending, no wallet keys. The API produces a canonical decision memo and its SHA-256 hash. The contract anchors that hash.

All routes except `/health` and the x402 payment endpoint require `x-api-key` matching `SAKSI_API_KEY`. The x402 endpoint is public and protected by payment proof. There is no tenant separation or key rotation yet. The store is in-memory and is not production-ready.

x402 config is enabled only when `SAKSI_X402_PAY_TO` and `SAKSI_X402_ASSET` are set. See `docs/architecture/x402.md` for the exact scheme and its limitations.
