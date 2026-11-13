const present = v => v !== undefined && v !== null && v !== '';
const numeric = v => present(v) && Number.isFinite(Number(v));
const statusMap = value => {
  const s = String(value || '').toUpperCase();
  if (s === 'SUCCESS' || s === 'SETTLED') return 'SETTLED';
  if (['PENDING_DEPOSIT','KNOWN_DEPOSIT_TX','PROCESSING','INCOMPLETE_DEPOSIT'].includes(s)) return 'PENDING';
  if (s === 'FAILED') return 'FAILED';
  if (s === 'REFUNDED') return 'REFUNDED';
  return 'UNKNOWN';
};
function exactDelta(a, b) {
  if (!numeric(a) || !numeric(b)) return null;
  const parts = [String(a), String(b)].map(x => x.split('.'));
  const places = Math.max(...parts.map(p => (p[1] || '').length));
  const scale = 10n ** BigInt(places);
  const toInt = x => { const [whole, frac = ''] = String(x).split('.'); return BigInt(whole) * scale + BigInt((frac + '0'.repeat(places)).slice(0, places) || '0'); };
  const diff = toInt(a) - toInt(b);
  const negative = diff < 0n;
  const abs = negative ? -diff : diff;
  const whole = abs / scale;
  const fraction = places ? ('.' + String(abs % scale).padStart(places, '0').replace(/0+$/, '')).replace(/\.$/, '') : '';
  return (negative ? '-' : '') + whole.toString() + fraction;
}
const short = v => v ? `${String(v).slice(0,9)}…${String(v).slice(-6)}` : 'Not exposed';
export function buildForensicReport(tx) {
  const status = statusMap(tx.status);
  const inputKnown = present(tx.amountIn) || present(tx.amountInRaw);
  const outputKnown = present(tx.amountOut) || present(tx.amountOutRaw);
  const expectedKnown = present(tx.expectedOut) || present(tx.expectedOutRaw);
  const input = { amount: tx.amountIn ?? tx.amountInRaw ?? null, symbol: tx.originAsset ?? 'Asset not exposed', usdValue: numeric(tx.amountInUsd) ? Number(tx.amountInUsd) : null, source: inputKnown ? 'VERIFIED' : 'UNEXPOSED' };
  const expectedOutput = { amount: tx.expectedOut ?? tx.expectedOutRaw ?? null, symbol: tx.destinationAsset ?? 'Asset not exposed', source: expectedKnown ? 'VERIFIED' : 'UNEXPOSED' };
  const actualOutput = { amount: tx.amountOut ?? tx.amountOutRaw ?? null, symbol: tx.destinationAsset ?? 'Asset not exposed', usdValue: numeric(tx.amountOutUsd) ? Number(tx.amountOutUsd) : null, source: outputKnown ? 'VERIFIED' : 'UNEXPOSED' };
  const fees = [];
  // Explorer appFees are explicit fee instructions, not proof that the full network/solver fee was itemized.
  for (const f of (tx.appFees ?? [])) if (present(f?.fee)) fees.push({ label: 'Application fee (API raw value; denomination not established here)', amount: f.fee, recipient: f.recipient ?? null, source: 'VERIFIED' });
  if (present(tx.refundFee)) fees.push({ label: 'Refund fee (API-reported)', amount: tx.refundFee, source: 'VERIFIED' });
  const feeBreakdownStatus = fees.length ? 'PARTIAL' : 'UNEXPOSED';
  const sameAsset = present(tx.destinationAsset) && expectedOutput.symbol === actualOutput.symbol;
  const comparableFormatted = present(tx.expectedOut) && present(tx.amountOut);
  const comparableRaw = !comparableFormatted && present(tx.expectedOutRaw) && present(tx.amountOutRaw);
  const deltaAmount = expectedKnown && outputKnown && sameAsset && (comparableFormatted || comparableRaw)
    ? exactDelta(comparableFormatted ? tx.expectedOut : tx.expectedOutRaw, comparableFormatted ? tx.amountOut : tx.amountOutRaw)
    : null;
  const deltaPercentage = deltaAmount !== null && Number(expectedOutput.amount) !== 0 ? Number(deltaAmount) / Number(expectedOutput.amount) * 100 : null;
  const negativeDelta = deltaAmount !== null && Number(deltaAmount) > 0;
  const originHash = tx.originTxs?.[0];
  const destHash = tx.destinationTxs?.[0];
  const journey = [
    { title:'Origin Deposit', detail:tx.originAsset ?? 'Origin asset not exposed', value:input.amount, timestamp:tx.createdAt ?? null, txHash:originHash?.hash ?? null, explorerUrl:originHash?.explorerUrl ?? null },
    { title:'Intent Solver', detail:tx.intentHash ? `Intent ${short(tx.intentHash)}` : 'Intermediate solver execution details not exposed', value:null, timestamp:null, txHash:tx.nearTxs?.[0]?.hash ?? null, explorerUrl:tx.nearTxs?.[0]?.explorerUrl ?? null },
    { title:'Destination Settlement', detail:tx.destinationAsset ?? 'Destination asset not exposed', value:actualOutput.amount, timestamp:null, txHash:destHash?.hash ?? null, explorerUrl:destHash?.explorerUrl ?? null },
  ];
  const hasDiscrepancy = negativeDelta || feeBreakdownStatus === 'UNEXPOSED';
  const missingCore = !inputKnown || !outputKnown || !tx.originAsset || !tx.destinationAsset;
  const integrityLevel = negativeDelta ? 'DISCREPANCY_DETECTED' : (missingCore || !expectedKnown || feeBreakdownStatus !== 'COMPLETE' ? 'INCOMPLETE_DATA' : 'CLEAN');
  const notes = [];
  if (!expectedKnown) notes.push('A quoted expected-output amount was not returned, so expected-versus-actual delta cannot be calculated.');
  else if (!outputKnown) notes.push('The quote output is available, but an actual settled output amount is not exposed yet.');
  else if (!sameAsset) notes.push('Expected and actual outputs could not be compared because their asset identifiers are missing or differ.');
  else if (deltaAmount !== null) notes.push(`Quoted output minus actual output is ${deltaAmount} ${expectedOutput.symbol} (derived from the two API-reported amounts).`);
  if (!tx.intentHash) notes.push('An intent hash was not exposed in this response.');
  if (feeBreakdownStatus === 'UNEXPOSED') notes.push('No itemized fee fields were returned. Solver spread and destination-chain gas cannot be inferred from this payload.');
  else notes.push('Some fee fields are exposed, but this does not establish a complete network-cost breakdown.');
  return {
    status, journey, financials:{ input, expectedOutput, actualOutput, explicitFees:fees, feeBreakdownStatus },
    discrepancy:{ hasDiscrepancy, deltaAmount, deltaPercentage, accountabilityNote:notes.join(' ') },
    integrityLevel,
    evidence:{ provider:tx.provider, depositAddress:tx.depositAddress ?? null, intentHash:tx.intentHash ?? null, originTxs:tx.originTxs ?? [], destinationTxs:tx.destinationTxs ?? [], nearTxs:tx.nearTxs ?? [], refundReason:tx.refundReason ?? null },
    raw:tx.raw,
  };
}
