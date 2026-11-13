function Badge({ source }) {
  const styles = source === 'VERIFIED' ? 'text-emerald-300 border-emerald-900 bg-emerald-950/40' : source === 'DERIVED' ? 'text-cyan-300 border-cyan-900 bg-cyan-950/40' : 'text-amber-300 border-amber-900 bg-amber-950/40';
  return <span className={`mono text-[10px] tracking-wider border rounded px-2 py-1 ${styles}`}>{source}</span>;
}
export default function FinancialBreakdown({ financials }) {
  const rows = [
    ['Input', financials.input.amount, financials.input.symbol, financials.input.usdValue != null ? `$ ${financials.input.usdValue}` : null, financials.input.source],
    ['Expected output', financials.expectedOutput.amount, financials.expectedOutput.symbol, null, financials.expectedOutput.source],
    ['Actual output', financials.actualOutput.amount, financials.actualOutput.symbol, financials.actualOutput.usdValue != null ? `$ ${financials.actualOutput.usdValue}` : null, financials.actualOutput.source],
  ];
  return <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[540px]">
      <thead><tr className="text-left text-slate-500 border-b border-slate-700"><th className="py-3 font-medium">Ledger item</th><th className="py-3 font-medium">Amount</th><th className="py-3 font-medium">Asset</th><th className="py-3 font-medium">USD value</th><th className="py-3 font-medium">Evidence</th></tr></thead>
      <tbody>{rows.map(([label, amount, asset, usd, source]) => <tr key={label} className="border-b border-slate-800"><td className="py-4 text-slate-300">{label}</td><td className="py-4 mono text-white">{amount ?? 'Not exposed'}</td><td className="py-4 text-slate-400 break-all max-w-40">{asset}</td><td className="py-4 mono text-slate-400">{usd ?? '—'}</td><td className="py-4"><Badge source={source}/></td></tr>)}
      <tr><td className="py-4 text-slate-300">Itemized fees</td><td colSpan="3" className="py-4 text-slate-400">{financials.explicitFees.length ? financials.explicitFees.map((f,i) => <div key={i}>{f.label}: <span className="mono text-white">{f.amount}</span>{f.recipient ? ` → ${f.recipient}` : ''}</div>) : 'Not exposed by solver/API'}</td><td><Badge source={financials.explicitFees.length ? 'VERIFIED' : 'UNEXPOSED'}/></td></tr></tbody>
    </table>
    <p className="text-xs text-slate-500 mt-3">Asset identifiers are shown as returned by the API. Raw fee values are not converted because their unit is not specified in the transaction record.</p>
  </div>;
}