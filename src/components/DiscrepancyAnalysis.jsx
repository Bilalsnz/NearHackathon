import { AlertTriangle, ShieldAlert } from 'lucide-react';
export default function DiscrepancyAnalysis({ discrepancy, integrityLevel }) {
  return <div className={`rounded-xl border p-5 ${integrityLevel === 'CLEAN' ? 'border-emerald-800 bg-emerald-950/20' : 'border-amber-800/70 bg-amber-950/20'}`}>
    <div className="flex items-center gap-2 mb-3">{integrityLevel === 'CLEAN' ? <ShieldAlert className="text-emerald-300"/> : <AlertTriangle className="text-amber-300"/>}<h3 className="font-semibold text-white">{discrepancy.deltaAmount != null ? 'Output difference' : 'Evidence gap detected'}</h3></div>
    <p className="text-sm leading-6 text-slate-300">{discrepancy.accountabilityNote}</p>
    {discrepancy.deltaAmount != null && <p className="mono mt-4 text-2xl text-amber-200">{discrepancy.deltaAmount} <span className="text-sm">{discrepancy.deltaPercentage}%</span></p>}
  </div>;
}