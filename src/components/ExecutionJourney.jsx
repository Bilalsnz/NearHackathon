import { ArrowUpRight, CircleCheck, CircleDashed, ExternalLink } from 'lucide-react';
const explorerUrl = hash => hash?.startsWith('0x') ? `https://etherscan.io/tx/${hash}` : `https://nearblocks.io/txns/${hash}`;
export default function ExecutionJourney({ journey }) {
  return <div className="grid gap-3 md:grid-cols-3">
    {journey.map((step, i) => <article key={step.title} className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-5 relative">
      <div className="flex items-center gap-2 text-emerald-300 mb-4">{i === 2 ? <CircleCheck size={17}/> : <CircleDashed size={17}/>}<span className="kicker">STEP 0{i + 1}</span></div>
      <h3 className="font-semibold text-white">{step.title}</h3>
      <p className="mt-2 text-sm text-slate-400 break-all">{step.detail}</p>
      {step.value != null && <p className="mono text-sm mt-3 text-slate-200">{step.value}</p>}
      {step.timestamp && <p className="mono text-xs mt-3 text-slate-500">{new Date(step.timestamp).toLocaleString()}</p>}
      {step.txHash ? <a className="inline-flex items-center gap-1 text-xs text-cyan-300 mt-4 hover:text-cyan-200" href={explorerUrl(step.txHash)} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12}/></a> : <p className="text-xs text-slate-600 mt-4">Transaction link not exposed</p>}
    </article>)}
  </div>;
}