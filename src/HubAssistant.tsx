import { useEffect, useState, type FormEvent } from 'react';

type ChatMessage = { author: 'assistant' | 'user'; text: string };
type Finding = { id: string; kind: string; severity: 'high' | 'medium' | 'info'; title: string; description: string; evidence: string; recommendation: string; sourceId: string };
type Insights = { mode: string; method: string; sourcesAnalysed: number; findings: Finding[]; note: string };

export function HubAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightError, setInsightError] = useState('');
  const [loading, setLoading] = useState(false);

  const addAssistantMessage = (text: string) => setMessages((current) => [...current, { author: 'assistant', text }]);

  async function refreshInsights() {
    setLoading(true);
    setInsightError('');
    try {
      const response = await fetch('/api/assistant/insights', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Analysis service unavailable (${response.status})`);
      const body = await response.json();
      if (!Array.isArray(body.findings)) throw new Error('Unexpected analysis response');
      setInsights(body);
    } catch (error) {
      setInsightError(error instanceof Error ? error.message : 'Analysis unavailable');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open && !insights && !loading && !insightError) void refreshInsights(); }, [open]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setMessages((current) => [...current, { author: 'user', text }]);
    setInput('');
    setSending(true);
    try {
      const response = await fetch('/api/assistant/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? `Request failed (${response.status})`);
      addAssistantMessage(body.answer);
    } catch (error) {
      addAssistantMessage(error instanceof Error ? error.message : 'Something went wrong.');
    } finally { setSending(false); }
  };

  const opportunities = insights?.findings.filter((finding) => finding.kind === 'opportunity') ?? [];
  const risks = insights?.findings.filter((finding) => finding.kind !== 'opportunity') ?? [];
  const review = (finding: Finding) => addAssistantMessage(`${finding.title}\n\n${finding.description}\n\nEvidence: ${finding.evidence}\nRecommended next step: ${finding.recommendation}\n\nThis is a catalogue-based signal, not a verified live-data incident.`);

  return (
    <>
      <button type="button" className="hub-assistant-orb" aria-label="Open Hub Assistant" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <img className="hub-assistant-mascot" src="/mini-genie.svg" alt="" />
      </button>
      <aside className={`hub-assistant-panel ${open ? 'is-open' : ''}`} aria-hidden={!open} aria-label="Hub Assistant">
        <header className="hub-assistant-header">
          <div className="hub-assistant-identity">
            <span className="hub-assistant-mini" aria-hidden="true"><img className="hub-assistant-mascot-mini" src="/mini-genie.svg" alt="" /></span>
            <div><strong>Genie — Hub Assistant</strong><small>Data &amp; AI intelligence companion</small></div>
          </div>
          <button type="button" className="hub-assistant-close" aria-label="Close Hub Assistant" onClick={() => setOpen(false)}>×</button>
        </header>
        <div className="hub-assistant-body">
          <div className="hub-assistant-welcome">
            <strong>Catalogue analysis</strong>
            <p>Evidence-based signals from available metadata. Live records and historical incidents are not assessed.</p>
            <button type="button" className="hub-assistant-refresh" onClick={() => void refreshInsights()} disabled={loading}>{loading ? 'Analysing…' : '↻ Refresh analysis'}</button>
          </div>
          {insightError && <p role="alert" className="hub-assistant-error">{insightError}. Check the governance API on port 8000, then refresh.</p>}
          {insights && <p className="hub-assistant-disclaimer">DEMO DATA · {insights.sourcesAnalysed} sources · rule-based diagnostic. No predictive confidence scores.</p>}
          <section className="hub-assistant-card opportunity">
            <div className="hub-assistant-card-head"><span><em className="assistant-icon blue">✦</em><div><small>OPPORTUNITY RADAR</small><h3>Data consolidation review</h3></div></span><b className="assistant-status">{opportunities.length} SIGNALS</b></div>
            {opportunities.length ? opportunities.slice(0, 3).map((finding) => (
              <article key={finding.id} className="hub-assistant-insight"><h4>{finding.title}</h4><p>{finding.description}</p><div className="hub-assistant-meta"><span>Evidence<strong>{finding.evidence}</strong></span></div><button type="button" className="hub-assistant-primary" onClick={() => review(finding)}>Review finding →</button></article>
            )) : <p className="hub-assistant-empty">{loading ? 'Analysing catalogue…' : insights ? 'No related-dataset signals found in the catalogue.' : 'Open analysis to inspect the catalogue.'}</p>}
          </section>
          <section className="hub-assistant-library">
            <div className="hub-assistant-card-head"><span><em className="assistant-icon amber">!</em><div><small>DATA QUALITY &amp; GOVERNANCE</small><h3>Observed metadata signals</h3></div></span><b className="assistant-count">{risks.length} findings</b></div>
            <p className="hub-assistant-library-copy">These are checks against catalogue metadata, not historical failure predictions.</p>
            {risks.slice(0, 8).map((finding) => <FailureCard key={finding.id} finding={finding} onReview={() => review(finding)} />)}
            {insights && risks.length === 0 && <p className="hub-assistant-empty">No issues matched the current diagnostic rules.</p>}
          </section>
          <div className="hub-assistant-messages" aria-live="polite">
            {messages.map((message, index) => <div key={index} className={`hub-assistant-message ${message.author}`}>{message.text}</div>)}
            {sending && <div className="hub-assistant-message assistant">Thinking…</div>}
          </div>
        </div>
        <form className="hub-assistant-input" onSubmit={sendMessage}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about catalogue signals..." aria-label="Ask the Hub Assistant" />
          <button type="submit" disabled={sending} aria-label="Send message">↑</button>
        </form>
      </aside>
    </>
  );
}

function FailureCard({ finding, onReview }: { finding: Finding; onReview: () => void }) {
  return <article className="hub-assistant-failure"><div className="hub-assistant-failure-top"><strong><i className={`hub-assistant-severity ${finding.severity === 'high' ? 'high' : 'medium'}`} />{finding.title}</strong><span>{finding.severity}</span></div><b>Observed evidence</b><p>{finding.description}</p><footer><span>{finding.evidence}</span><button type="button" onClick={onReview}>View analysis →</button></footer></article>;
}
