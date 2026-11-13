const EXPLORER = 'https://explorer.near-intents.org/api/v0/transactions';
const ONE_CLICK = 'https://1click.chaindefuser.com/v0/status';
const NEAR_RPC = 'https://rpc.mainnet.near.org';

// No sample identifiers are hardcoded: the public documentation's sample values are illustrative,
// not confirmed live transactions. Add a sample only after verifying it against mainnet.
export const SAMPLE_TRANSACTIONS = [];

async function requestJson(url, options = {}) {
  let response;
  try { response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...options.headers } }); }
  catch { throw new Error('Network/CORS error while contacting the public endpoint. No fallback or mock data was used.'); }
  if (!response.ok) {
    if (response.status === 404) throw new Error('No matching transaction was found (404).');
    if (response.status === 401 || response.status === 403) throw new Error('The Explorer API requires authorization. This browser-only build has no private API token configured.');
    if (response.status === 429) throw new Error('The public API rate limit was reached (429). Please wait and retry.');
    throw new Error(`The public API returned HTTP ${response.status}.`);
  }
  try { return await response.json(); }
  catch { throw new Error('The API response was not valid JSON.'); }
}

const first = (...values) => values.find(v => v !== undefined && v !== null && v !== '');
const asArray = v => Array.isArray(v) ? v : (v ? [v] : []);

function normalizeExplorer(row) {
  return {
    provider: 'NEAR Intents Explorer',
    raw: row,
    status: first(row.status, 'UNKNOWN'),
    depositAddress: first(row.depositAddress, row.deposit_address),
    depositMemo: first(row.depositMemo, row.deposit_memo),
    intentHash: first(row.intentHashes, row.intentHash),
    createdAt: first(row.createdAt, row.created_at),
    originAsset: first(row.originAsset, row.origin_asset),
    destinationAsset: first(row.destinationAsset, row.destination_asset),
    amountIn: first(row.amountInFormatted, row.amount_in_formatted),
    amountInRaw: first(row.amountIn, row.amount_in),
    amountInUsd: first(row.amountInUsd, row.amount_in_usd),
    amountOut: first(row.amountOutFormatted, row.amount_out_formatted),
    amountOutRaw: first(row.amountOut, row.amount_out),
    amountOutUsd: first(row.amountOutUsd, row.amount_out_usd),
    appFees: asArray(row.appFees ?? row.app_fees),
    refundFee: first(row.refundFeeFormatted, row.refundFee, row.refund_fee),
    originTxs: asArray(first(row.originChainTxHashes, row.origin_chain_tx_hashes)),
    destinationTxs: asArray(first(row.destinationChainTxHashes, row.destination_chain_tx_hashes)),
    nearTxs: asArray(first(row.nearTxHashes, row.near_tx_hashes)),
    sender: asArray(row.senders)[0],
    recipient: row.recipient,
    refundReason: row.refundReason,
  };
}

function normalizeOneClick(row) {
  const d = row?.swapDetails ?? row?.details ?? {};
  return {
    provider: '1Click Status API',
    raw: row,
    status: first(row?.status, 'UNKNOWN'),
    depositAddress: first(row?.depositAddress, d.depositAddress),
    createdAt: first(row?.createdAt, row?.created_at),
    originAsset: first(d.originAsset, d.origin_asset),
    destinationAsset: first(d.destinationAsset, d.destination_asset),
    amountIn: first(d.amountInFormatted, d.amountIn, d.amount_in),
    amountOut: first(d.amountOutFormatted, d.amountOut, d.amount_out),
    amountInUsd: first(d.amountInUsd),
    amountOutUsd: first(d.amountOutUsd),
    appFees: [],
    refundFee: first(d.refundFeeFormatted, d.refundFee),
    originTxs: asArray(first(d.originChainTxHashes, d.originTxHashes)),
    destinationTxs: asArray(first(d.destinationChainTxHashes, d.destinationTxHashes)),
    nearTxs: asArray(d.nearTxHashes),
    intentHash: first(d.intentHashes, d.intentHash),
    sender: first(d.sender),
    recipient: first(d.recipient),
    refundReason: first(row?.reason, d.refundReason),
  };
}

async function lookupExplorer(identifier) {
  const url = new URL(EXPLORER);
  url.searchParams.set('search', identifier);
  url.searchParams.set('numberOfTransactions', '10');
  const result = await requestJson(url.toString());
  const rows = Array.isArray(result) ? result : (result?.transactions ?? result?.items ?? []);
  if (!rows.length) throw new Error('Explorer returned no matching transactions.');
  const exact = rows.find(r => [r.depositAddress, r.depositAddressAndMemo, r.intentHashes, ...(r.originChainTxHashes ?? []), ...(r.destinationChainTxHashes ?? []), ...(r.nearTxHashes ?? [])].includes(identifier));
  return normalizeExplorer(exact ?? rows[0]);
}

async function lookupOneClick(identifier) {
  const url = new URL(ONE_CLICK);
  url.searchParams.set('depositAddress', identifier);
  return normalizeOneClick(await requestJson(url.toString()));
}

async function lookupNearRpc(identifier) {
  const body = { jsonrpc: '2.0', id: 'receipt', method: 'EXPERIMENTAL_tx_status', params: [identifier, 'system'] };
  const data = await requestJson(NEAR_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (data.error) throw new Error(data.error.message || 'NEAR RPC could not verify this transaction.');
  return { provider: 'NEAR RPC', raw: data.result, status: 'UNKNOWN', nearTxs: [identifier], originTxs: [], destinationTxs: [], appFees: [] };
}

export async function fetchTransaction(identifier) {
  const id = identifier.trim();
  if (!id) throw new Error('Enter a deposit address, intent hash, or transaction hash.');
  // The 1Click status route is keyed by deposit address; try it first for address-like inputs.
  if (/^[A-Za-z0-9_-]{20,}$/.test(id) && !id.startsWith('0x')) {
    try { return await lookupOneClick(id); } catch (oneClickError) {
      try { return await lookupExplorer(id); } catch (explorerError) {
        if (/^[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(id)) {
          try { return await lookupNearRpc(id); } catch { /* preserve useful API error below */ }
        }
        throw new Error(`1Click lookup: ${oneClickError.message} Explorer lookup: ${explorerError.message}`);
      }
    }
  }
  try { return await lookupExplorer(id); }
  catch (error) {
    if (/^[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(id)) return lookupNearRpc(id);
    throw error;
  }
}
