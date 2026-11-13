# RECEIPT — NEAR Intents transaction forensics

A client-side, read-only React app that looks up transaction information and presents a cautious evidence summary.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## Current data sources

- **1Click status:** `GET https://1click.chaindefuser.com/v0/status?depositAddress=...`
- **NEAR Intents Explorer:** `GET https://explorer.near-intents.org/api/v0/transactions?search=...&numberOfTransactions=10`
- **NEAR RPC:** `EXPERIMENTAL_tx_status` for a NEAR transaction hash.

The Explorer API reference documents a Bearer JWT authorization header. This repository is a browser-only application and does not contain a private token. If the Explorer rejects an unauthenticated browser request, the app displays that authorization error; it does not bypass authentication. Browser CORS policy may also prevent direct requests.

## Evidence policy

- **VERIFIED:** A field returned by the selected API response.
- **DERIVED:** A deterministic calculation from verified values. The current Explorer schema does not provide a quoted expected-output value, so RECEIPT does not calculate an expected-versus-actual delta.
- **UNEXPOSED:** The endpoint did not expose the information. Missing data is not filled with examples or estimates.

The Explorer transaction schema documents `amountInFormatted`, `amountOutFormatted`, USD values, `appFees`, `refundFeeFormatted`, status, asset identifiers and transaction hashes. Raw fee values are shown without unit conversion where the schema does not establish their denomination. The presence of an application fee does not prove that all solver spread, gas or network costs are itemized.

## Samples

No hardcoded sample transaction IDs are included. Public documentation examples are illustrative placeholders, not verified mainnet records. Add sample IDs only after checking that each identifier resolves to a real transaction on the live service.

## Scope and limitations

- No backend, wallet connection, smart contract, token, paid API or mock-data fallback.
- No quote comparison unless a future data source exposes a verifiable quote for the same transaction and asset unit.
- The current UI maps EVM hashes to Etherscan and other hashes to NearBlocks for convenience; chain-specific explorer routing is not yet comprehensive.
- RPC transaction status alone does not prove a NEAR Intents swap's complete cross-chain settlement.
- API availability, authentication, response shape and CORS are controlled by the upstream services.

## Deployment

Deploy as a standard Vite static site on Vercel or GitHub Pages. For GitHub Pages, configure the repository's Pages source/build workflow and ensure the Vite base path matches the repository path if deploying under a project URL.
