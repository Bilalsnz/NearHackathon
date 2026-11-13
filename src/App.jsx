import { useState } from 'react';
import { Search, ArrowDownToLine, ShieldCheck, ScanSearch, AlertCircle } from 'lucide-react';
import { fetchTransaction, SAMPLE_TRANSACTIONS } from './lib/intentsApi';
import { buildForensicReport } from './lib/forensicEngine';
import ExecutionJourney from './components/ExecutionJourney';
import FinancialBreakdown from './components/FinancialBreakdown';
import DiscrepancyAnalysis from './components/DiscrepancyAnalysis';
import ReceiptCard3D from './components/ReceiptCard3D';

function Section({ number, title, children }) { return <section className="panel p-5 sm:p-7"><div className="flex items-center gap-3 mb-6"><span className="mono text-xs text-cyan-300">{number}</span><h2 className="text-lg font-semibold text-white">{title}</h2></div>{children}</section>; }
export default function App() {
  const [identifier,setIdentifier] = useState('');
  const [activeId,setActiveId] = useState('');
  const [report,setReport] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  async function investigate(value = identifier) {
    const id = value.trim(); if (!id) { setError('Paste a deposit address, intent hash, or transaction hash.'); return; }
    setLoading(true); setError(''); setReport(null); setActiveId(id);
    try { const tx = await fetchTransaction(id); setReport(buildForensicReport(tx)); }
    catch(e) { setError(e.message || 'Unable to investigate this identifier.'); }
    finally { setLoading(false); }
  }
  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
    <header className="flex items-center justify-between mb-16"><a href="#" className="flex items-center gap-2 font-bold tracking-[.18em] text-white"><span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-300 text-slate-950"><ScanSearch size={18}/></span>RECEIPT</a><span className="kicker hidden sm:block">NEAR INTENTS · TRANSACTION FORENSICS</span><span className="mono text-[10px] text-emerald-300 border border-emerald-900 rounded-full px-3 py-1">READ ONLY</span></header>
    <div className="max-w-3xl mb-12"><p className="kicker mb-4">A clearer view of cross-chain execution</p><h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.08] text-white">Know what actually happened to <span className="text-emerald-300">your money.</span></h1><p className="text-slate-400 mt-5 text-base sm:text-lg leading-7">Blockchains tell you that your transaction succeeded. RECEIPT tells you what actually happened to your money.</p></div>
    <Section number="01" title="Transaction search">
      <form className="flex flex-col sm:flex-row gap-3" onSubmit={e => {e.preventDefault();investigate();}}><div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Paste deposit address, intent hash or TX hash" className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-4 py-4 text-sm text-white outline-none focus:border-emerald-400 placeholder:text-slate-600"/></div><button disabled={loading} className="rounded-xl bg-emerald-300 hover:bg-emerald-200 disabled:opacity-50 text-slate-950 font-bold px-7 py-4 flex items-center justify-center gap-2"><ScanSearch size={17}/>{loading ? 'Investigating…' : 'Investigate'}</button></form>
      {SAMPLE_TRANSACTIONS.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{SAMPLE_TRANSACTIONS.map((s,i)=><button key={s.id} onClick={()=>{setIdentifier(s.id);investigate(s.id)}} className="text-xs border border-slate-700 rounded-full px-3 py-2 text-slate-400 hover:text-white">Load Real TX #{i+1}</button>)}</div>}
      {SAMPLE_TRANSACTIONS.length === 0 && <p className="text-xs text-slate-600 mt-4">No sample transactions are published yet. We will not present fabricated IDs as real mainnet evidence.</p>}
      {loading && <div className="mt-5 text-center"><div className="loader"><span className="dot"/><span className="dot"/><span className="dot"/></div><p className="text-xs text-slate-500">Querying public endpoints — no mock data</p></div>}
      {error && <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200"><AlertCircle size={18} className="shrink-0"/>{error}</div>}
    </Section>
    {report && <div className="mt-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1"><div><p className="kicker">Investigation result</p><p className="mono text-xs text-slate-400 mt-1 break-all">{activeId}</p></div><span className={`mono text-xs px-3 py-2 rounded-full border ${report.status==='SETTLED'?'text-emerald-300 border-emerald-900 bg-emerald-950/30':'text-amber-300 border-amber-900 bg-amber-950/30'}`}>{report.status}</span></div>
      <Section number="02" title="Execution journey"><ExecutionJourney journey={report.journey}/></Section>
      <Section number="03" title="Financial breakdown"><FinancialBreakdown financials={report.financials}/></Section>
      <Section number="04" title="Discrepancy analysis"><DiscrepancyAnalysis discrepancy={report.discrepancy} integrityLevel={report.integrityLevel}/></Section>
      <Section number="05" title="Digital receipt"><div className="grid md:grid-cols-[1fr_340px] gap-8 items-center"><div><div className="flex items-center gap-2 text-emerald-300 mb-3"><ShieldCheck size={18}/><span className="kicker">Evidence-backed summary</span></div><h3 className="text-2xl text-white font-semibold mb-3">A receipt, not a guess.</h3><p className="text-sm text-slate-400 leading-6">The card exports only the evidence returned by the endpoint and deterministic conclusions drawn from it. Missing quote and fee data stays visibly missing.</p><p className="mono text-xs text-slate-500 mt-5">SOURCE · {report.evidence.provider}</p></div><ReceiptCard3D report={report} identifier={activeId}/></div></Section>
    </div>}
    <footer className="mt-14 pt-6 border-t border-slate-800 flex flex-col sm:flex-row gap-3 justify-between text-xs text-slate-600"><span>RECEIPT · Independent read-only transaction analysis</span><span>VERIFIED means returned by the source. It does not mean independently audited.</span></footer>
  </main>;
}