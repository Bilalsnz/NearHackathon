const present = v => v !== undefined && v !== null && v !== '';
const numberOrNull = v => present(v) && Number.isFinite(Number(v)) ? Number(v) : null;
const statusMap = status => {
  const s = String(status || '').toUpperCase();
  if (['SUCCESS', 'SETTLED'].includes(s)) return 'SETTLED';
  if (['PENDING_DEPOSIT', 'KNOWN_DEPOSIT_TX', 'PROCESSING', 'INCOMPLETE_DEPOSIT'].includes(s)) return 'PENDING';
  if (s === 'FAILED') return 'FAILED';
  if (s === 'REFUNDED') return 'REFUNDED';
  return 'UNKNOWN';
};
const short = v => v ? `${String(v).slice(0, 9)}…${String(v).slice(-6)}` : 'Not exposed';

export function buildForensicReport(tx) {
  const status = statusMap(tx.status);
  const inputKnown = present(tx.amountIn) || present(tx.amountInRaw);
  const outputKnown = present(tx.amountOut) || present(tx.amountOutRaw);
  const input = { amount: tx.amountIn ?? tx.amountInRaw ?? null, symbol: tx.originAsset ?? 'Asset not exposed', usdValue: numberOrNull(tx.amountInUsd), source: inputKnown ? 'VERIFIED' : 'UNEXPOSED' };
  const expectedOutput = { amount: null, symbol: tx.destinationAsset ?? 'Asset not exposed', source: 'UNEXPOSED' };
  const actualOutput = { amount: tx.amountOut ?? tx.amountOutRaw ?? null, symbol: tx.destinationAsset ?? 'Asset not exposed', usdValue: numberOrNull(tx.amountOutUsd), source: outputKnown ? 'VERIFIED' : 'UNEXPOSED' };
  const fees = [];
  if (Array.isArray(tx.appFees)) tx.appFees.forEach(f => {
    if (present(f?.fee)) fees.push({ label: 'Application fee (raw API value; unit not specified)', amount: f.fee, recipient: f.recipient ?? null, source: 'VERIFIED' });
  });
  if (present(tx.refundFee)) fees.push({ label: 'Refund fee (API-reported)', amount: tx.refundFee, source: 'VERIFIED' });
  const feeBreakdownStatus = fees.length ? 'PARTIAL' : 'UNEXPOSED';

  const journey = [
    { title: 'Origin Deposit', detail: tx.originAsset ?? 'Origin asset not exposed', value: input.amount, timestamp: tx.createdAt ?? null, txHash: tx.originTxs?.[0] ?? null, chain: tx.originAsset?.split(':')[1]?.split('-')[0] ?? null },
    { title: 'Intent Solver', detail: tx.intentHash ? `Intent ${short(tx.intentHash)}` : 'Solver execution details not exposed', value: null, timestamp: null, txHash: null, chain: 'NEAR Intents' },
    { title: 'Destination Settlement', detail: tx.destinationAsset ?? 'Destination asset not exposed', value: actualOutput.amount, timestamp: null, txHash: tx.destinationTxs?.[0] ?? null, chain: tx.destinationAsset?.split(':')[1]?.split('-')[0] ?? null },
  ];
  const deltaAmount = null; // Expected output is not present in the documented Explorer payload.
  const hasDiscrepancy = feeBreakdownStatus === 'UNEXPOSED';
  const missingCore = !inputKnown || !outputKnown || !tx.originAsset || !tx.destinationAsset;
  const integrityLevel = missingCore ? 'INCOMPLETE_DATA' : (hasDiscrepancy ? 'INCOMPLETE_DATA' : 'INCOMPLETE_DATA');
  const notes = [];
  if (!present(tx.intentHash)) notes.push('Intent hash and intermediate solver execution details are not exposed in this response.');
  notes.push('The public Explorer transaction schema does not expose a quoted expected-output amount, so no expected-versus-actual delta can be calculated.');
  if (feeBreakdownStatus === 'UNEXPOSED') notes.push('No itemized fee fields were returned. Solver spread and destination-chain gas cannot be inferred from the available payload.');
  else notes.push('Only the fee fields listed below are exposed; this is not necessarily a complete network-cost breakdown.');
  return {
    status, journey,
    financials: { input, expectedOutput, actualOutput, explicitFees: fees, feeBreakdownStatus },
    discrepancy: { hasDiscrepancy, deltaAmount, deltaPercentage: null, accountabilityNote: notes.join(' ') },
    integrityLevel,
    evidence: { provider: tx.provider, depositAddress: tx.depositAddress ?? null, intentHash: tx.intentHash ?? null, originTxs: tx.originTxs ?? [], destinationTxs: tx.destinationTxs ?? [], nearTxs: tx.nearTxs ?? [], refundReason: tx.refundReason ?? null },
    raw: tx.raw,
  };
}
