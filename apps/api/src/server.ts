import { buildApp, type AppOptions } from "./app";
import { FileReplayStore } from "./x402/replay";
import { StellarPaymentVerifier } from "./x402/stellar";
import type { X402Config } from "./x402/types";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const apiKey = process.env.SAKSI_API_KEY;
if (!apiKey) {
  console.error("SAKSI_API_KEY is required");
  process.exit(1);
}

let x402: X402Config | undefined;
let paymentVerifier: StellarPaymentVerifier | undefined;
let replayStore: FileReplayStore | undefined;

const payTo = process.env.SAKSI_X402_PAY_TO;
const asset = process.env.SAKSI_X402_ASSET;
if (payTo && asset) {
  x402 = {
    network: process.env.SAKSI_X402_NETWORK ?? "stellar:testnet",
    payTo,
    asset,
    amount: process.env.SAKSI_X402_AMOUNT ?? "10000000",
    resource:
      process.env.SAKSI_X402_RESOURCE ??
      `http://${host}:${port}/v1/x402/risk-report`,
    horizonUrl:
      process.env.SAKSI_X402_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    maxTimeoutSeconds: Number(process.env.SAKSI_X402_MAX_TIMEOUT_SECONDS ?? 60),
  };
  paymentVerifier = new StellarPaymentVerifier(x402);
  replayStore = new FileReplayStore(
    process.env.SAKSI_X402_REPLAY_DIR ?? ".data/x402-replay",
  );
}

const options: AppOptions = { apiKey };
if (x402 && paymentVerifier && replayStore) {
  options.x402 = x402;
  options.paymentVerifier = paymentVerifier;
  options.replayStore = replayStore;
}

const app = buildApp(options);

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`saksi-api listening on http://${host}:${port}`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
