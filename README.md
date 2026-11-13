# RECEIPT — NEAR Intents transaction forensics

A client-side, read-only React app that looks up transaction information and presents an evidence-labelled summary.

## Run locally

```bash
npm install
npm run dev
npm run build
```

## Data sources

- **1Click status:** `GET https://1click.chaindefuser.com/v0/status?depositAddress=...`
- **NEAR Intents Explorer:** `GET https://explorer.near-intents.org/api/v0/transactions?search=...&numberOfTransactions=10`

The Explorer API requires a JWT authorization header. This browser-only build does not contain a private token. If the Explorer rejects an unauthenticated request, the app displays the authorization error. It does not bypass authentication. Browser CORS policy may also prevent direct requests.

The 1Click status response includes the original `quoteResponse.quote` and actual `swapDetails`. Where both quoted and actual output values are present for the same destination asset, RECEIPT calculates their difference deterministically. It does not treat a quote as a completed payment.

## Evidence policy

- **VERIFIED:** A value returned directly by the selected API response.
- **DERIVED:** A deterministic calculation from verified fields. The quote-versus-actual output delta is calculated only when both amounts and the same destination asset are exposed.
- **UNEXPOSED:** The endpoint did not expose the information. Missing data is not filled with estimates or sample data.

Explorer fields include `amountInFormatted`, `amountOutFormatted`, USD values, `appFees`, `refundFeeFormatted`, status, asset identifiers and transaction hashes. The 1Click status API exposes quote output and actual settlement details. App fee instructions are not proof that all solver spread or network costs were itemized. Raw fee values are not converted unless the payload establishes their unit.

## Samples

No hardcoded sample transaction IDs are included. The API documentation's sample identifiers are illustrative, not verified mainnet transactions. Add sample IDs only after checking that each identifier resolves to a real transaction on the live service.

## Scope and limitations

- No backend, wallet connection, smart contract, token, paid API or mock-data fallback.
- The Explorer's JWT requirement means direct public-browser Explorer lookup may not be available without an authorized credential. Never place a private partner JWT in frontend source.
- The app does not call NEAR RPC as a generic transaction-hash fallback: NEAR transaction-status RPC requires the signer account ID in addition to the transaction hash, which cannot safely be inferred from an arbitrary hash alone.
- Chain-specific explorer routing is limited; a link is shown only when supplied by the API or when a known supported explorer can be selected.
- API availability, authentication, response shape and CORS are controlled by upstream services.

## Deployment

Deploy as a Vite static site on Vercel or GitHub Pages. For GitHub Pages, configure the Pages build workflow and set Vite's `base` path to the repository path if deploying under a project URL.
