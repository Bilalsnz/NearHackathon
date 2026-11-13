import { useState } from 'react';
import { Check, AlertTriangle, Copy, FileJson, ExternalLink, Download, CheckCheck } from 'lucide-react';
import './ReceiptCard3D.css';
export default function ReceiptCard3D({ report, identifier }) {
  const [tilted, setTilted] = useState(false);
  const [toast, setToast] = useState('');
  const input = report.financials.input, output = report.financials.actualOutput;
  const delta = report.discrepancy.deltaAmount == null ? 'Not exposed' : String(report.discrepancy.deltaAmount);
  const markdown = `# RECEIPT // ${identifier}\n\n- Status: ${report.status}\n- Input: ${input.amount ?? 'Not exposed'} ${input.symbol}\n- Output: ${output.amount ?? 'Not exposed'} ${output.symbol}\n- Delta: ${delta}\n- Integrity: ${report.integrityLevel}\n- Evidence provider: ${report.evidence.provider}\n\n${report.discrepancy.accountabilityNote}`;
  const proof = JSON.stringify(report, null, 2);
  const notify = async (label, value) => { try { await navigator.clipboard.writeText(value); setToast(label); setTimeout(() => setToast(''), 1800); } catch { setToast('Clipboard unavailable'); } };
  const download = () => { const blob = new Blob([proof], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `receipt-${String(identifier).slice(0,12)}.json`; a.click(); URL.revokeObjectURL(url); };
  const hash = report.evidence.destinationTxs?.[0] || report.evidence.originTxs?.[0] || report.evidence.nearTxs?.[0];
  const explorer = hash?.startsWith('0x') ? `https://etherscan.io/tx/${hash}` : hash ? `https://nearblocks.io/txns/${hash}` : report.evidence.depositAddress ? `https://explorer.near-intents.org/` : null;
  const warning = report.integrityLevel !== 'CLEAN';
  return <div className="receipt-parent">
    <div className={`receipt-card ${warning ? 'warning' : 'clean'} ${tilted ? 'is-tilted' : ''}`} onClick={() => setTilted(v => !v)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setTilted(v => !v)} aria-label="Toggle receipt card tilt">
      <div className="receipt-logo"><span className="circle circle1"/><span className="circle circle2"/><span className="circle circle3"/><span className="circle circle4"/><span className="circle circle5">{warning ? <AlertTriangle className="svg"/> : <Check className="svg"/>}</span></div>
      <div className="receipt-glass"/>
      <div className="receipt-content"><span className="title">RECEIPT // {String(identifier).slice(0,12)}{String(identifier).length > 12 ? '…' : ''}</span><span className="text">In: {input.amount ?? '—'}<br/>Out: {output.amount ?? '—'}<br/>Delta: {delta}</span><span className="receipt-status">{report.status} · {report.integrityLevel.replaceAll('_',' ')}</span></div>
      <div className="receipt-bottom"><div className="social-buttons-container">
        <button className="social-button social-button1" title="Copy Markdown receipt" onClick={e => {e.stopPropagation();notify('Copied receipt', markdown)}}><Copy className="svg"/></button>
        <button className="social-button social-button2" title="Copy JSON proof" onClick={e => {e.stopPropagation();notify('Copied JSON', proof)}}><FileJson className="svg"/></button>
        <button className="social-button social-button3" title="Open explorer" disabled={!explorer} onClick={e => {e.stopPropagation(); if(explorer) window.open(explorer,'_blank','noopener,noreferrer')}}><ExternalLink className="svg"/></button>
      </div><div className="view-more"><button className="view-more-button" onClick={e => {e.stopPropagation();download()}}>Download JSON</button><Download className="svg"/></div></div>
    </div>
    {toast && <div className="receipt-toast"><CheckCheck size={14}/>{toast}</div>}
    <p className="text-center text-xs text-slate-600 mt-3">Tap or hover the card to tilt it.</p>
  </div>;
}