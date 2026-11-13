const EXPLORER = 'https://explorer.near-intents.org/api/v0/transactions';
const ONE_CLICK = 'https://1click.chaindefuser.com/v0/status';

// These are intentionally empty until identifiers have been verified against live mainnet.
// Documentation sample IDs are illustrative examples, not real user transactions.
export const SAMPLE_TRANSACTIONS = [];

async function requestJson(url, options = {}) {
  let response;
  try { response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...options.headers } }); }
  catch { throw new Error('Network/CORS error contacting the public endpoint. No mock data was substituted.'); }
  if (!response.ok) {
    if (response.status === 404) throw new Error('No matching transaction was found (404).');
    if (response.status === 401 || response.status === 403) throw new Error('The NEAR Intents Explorer requires a JWT. This frontend has no private token configured.');
    if (response.status === 429) throw new Error('The public API rate limit was reached (429). Please wait and retry.');
    throw new Error(`The public API returned HTTP ${response.status}.`);
  }
  try { return await response.json(); } catch { throw new Error('The API response was not valid JSON.'); }
}
const first = (...values) => values.find(v => v !== undefined && v !== null && v !== '');
const arr = v => Array.isArray(v) ? v : (v ? [v] : []);
const txDetails = values => arr(values).map(v => typeof v === 'string' ? { hash: v, explorerUrl: null } : ({ hash: v?.hash ?? v?.txHash ?? null, explorerUrl: v?.explorerUrl ?? null })).filter(v => v.hash);

function normalizeExplorer(row) {
  return {
    provider: 'NEAR Intents Explorer', raw: row, status: first(row.status, 'UNKNOWN'),
    depositAddress: first(row.depositAddress, row.deposit_address),
    intentHash: first(row.intentHashes, row.intentHash),
    createdAt: first(row.createdAt, row.created_at),
    originAsset: first(row.originAsset, row.origin_asset), destinationAsset: first(row.destinationAsset, row.destination_asset),
    amountIn: first(row.amountInFormatted, row.amount_in_formatted), amountInRaw: first(row.amountIn, row.amount_in),
    amountInUsd: first(row.amountInUsd, row.amount_in_usd),
    expectedOut: null, expectedOutRaw: null,
    amountOut: first(row.amountOutFormatted, row.amount_out_formatted), amountOutRaw: first(row.amountOut, row.amount_out),
    amountOutUsd: first(row.amountOutUsd, row.amount_out_usd),
    appFees: arr(row.appFees ?? row.app_fees), refundFee: first(row.refundFeeFormatted, row.refund_fee_formatted),
    originTxs: txDetails(first(row.originChainTxHashes, row.origin_chain_tx_hashes)),
    destinationTxs: txDetails(first(row.destinationChainTxHashes, row.destination_chain_tx_hashes)),
    nearTxs: txDetails(first(row.nearTxHashes, row.near_tx_hashes)),
    refundReason: row.refundReason ?? null,
  };
}
function normalizeOneClick(row) {
  const d = row?.swapDetails ?? {};
  const quote = row?.quoteResponse?.quote ?? {};
  const request = row?.quoteResponse?.quoteRequest ?? {};
  return {
    provider: '1Click Status API', raw: row, status: first(row?.status, 'UNKNOWN'),
    depositAddress: first(quote.depositAddress, d.depositAddress),
    intentHash: arr(d.intentHashes)[0] ?? null,
    createdAt: first(row?.updatedAt, row?.createdAt),
    originAsset: first(request.originAsset, d.originAsset), destinationAsset: first(request.destinationAsset, d.destinationAsset),
    amountIn: first(d.amountInFormatted, d.depositedAmountFormatted), amountInRaw: first(d.amountIn, d.depositedAmount),
    amountInUsd: first(d.amountInUsd, d.depositedAmountUsd),
    expectedOut: first(quote.amountOutFormatted), expectedOutRaw: first(quote.amountOut),
    amountOut: first(d.amountOutFormatted), amountOutRaw: first(d.amountOut),
    amountOutUsd: d.amountOutUsd ?? null,
    appFees: [], refundFee: first(d.refundFeeFormatted),
    originTxs: txDetails(d.originChainTxHashes), destinationTxs: txDetails(d.destinationChainTxHashes),
    nearTxs: txDetails(d.nearTxHashes), refundReason: d.refundReason ?? null,
  };
}
async function lookupExplorer(identifier) {
  const url = new URL(EXPLORER);
  url.searchParams.set('search', identifier);
  url.searchParams.set('numberOfTransactions', '10');
  const rows = await requestJson(url.toString());
  const list = Array.isArray(rows) ? rows : (rows?.transactions ?? rows?.items ?? []);
  if (!list.length) throw new Error('Explorer returned no matching transactions.');
  const matches = list.filter(r => {
    const hashes = [...arr(r.originChainTxHashes), ...arr(r.destinationChainTxHashes), ...arr(r.nearTxHashes)];
    const values = [r.depositAddress, r.depositAddressAndMemo, r.intentHashes, r.recipient, ...arr(r.senders), ...hashes.map(x => typeof x === 'string' ? x : x?.hash)].filter(Boolean);
    return values.some(value => String(value).toLowerCase() === identifier.toLowerCase());
  });
  if (matches.length !== 1) {
    throw new Error(matches.length > 1
      ? 'The Explorer returned multiple exact matches. Use the deposit address or memo to narrow the lookup.'
      : 'The Explorer search results did not contain an exact identifier match. No unrelated transaction was selected.');
  }
  return normalizeExplorer(matches[0]);
}
async function lookupOneClick(identifier) {
  const url = new URL(ONE_CLICK);
  url.searchParams.set('depositAddress', identifier);
  return normalizeOneClick(await requestJson(url.toString()));
}
export async function fetchTransaction(identifier) {
  const id = identifier.trim();
  if (!id) throw new Error('Enter a deposit address, intent hash, or transaction hash.');
  // 1Click status is keyed by deposit address. For other IDs, query the Explorer directly.
  if (!id.startsWith('0x') && /^[A-Za-z0-9_-]{20,}$/.test(id)) {
    try { return await lookupOneClick(id); }
    catch (oneClickError) {
      try { return await lookupExplorer(id); }
      catch (explorerError) { throw new Error(`1Click status: ${oneClickError.message} Explorer: ${explorerError.message}`); }
    }
  }
  return lookupExplorer(id);
}
