'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles, Send, Loader2, TrendingUp, TrendingDown, Minus,
  ExternalLink, AlertTriangle, User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jwantraApi } from '@/lib/api';
import JwantraChart from './JwantraChart';

const SUGGESTED_PROMPTS = [
  "Summarize this month's performance",
  'Which patients are at risk of no-show?',
  'Forecast next quarter revenue',
  'Where can we cut costs?',
];

type AIMetric = { label: string; value: string; delta?: string; trend?: 'up' | 'down' | 'flat' };
type AIEntity = { kind: string; id: string; label: string; href: string };
type AIAction = { label: string; type: string; target: string; payload?: Record<string, any> };
type AIResponse = {
  answer: string;
  metrics?: AIMetric[];
  entities?: AIEntity[];
  charts?: any[];
  actions?: AIAction[];
  pending_confirmation?: { message: string } | null;
  matched_pipelines?: string[];
};

type Turn = { query: string; response?: AIResponse; error?: string };

// Jwantra's own frontend, for deep links out of entities/actions returned
// by /external/ask — those hrefs/targets are Jwantra routes (customer/
// product detail pages etc.) that don't exist inside ClinicKarobar, so
// they open in a new tab rather than trying to render them here.
const JWANTRA_APP_URL = 'https://app.jwantra.com';

export default function JwantraAnalysisPanel() {
  const [query, setQuery] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: (q: string) => jwantraApi.ask(q).then(r => r.data as AIResponse),
  });

  const ask = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || askMutation.isPending) return;
    setQuery('');
    setTurns(prev => [...prev, { query: trimmed }]);
    askMutation.mutate(trimmed, {
      onSuccess: (data) => {
        setTurns(prev => prev.map((t, i) => (i === prev.length - 1 ? { ...t, response: data } : t)));
      },
      onError: (e: any) => {
        const msg = e.response?.data?.message || 'Could not reach Jwantra AI. Please try again.';
        setTurns(prev => prev.map((t, i) => (i === prev.length - 1 ? { ...t, error: msg } : t)));
        toast.error(msg);
      },
    });
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, askMutation.isPending]);

  // Kick off with a default summary the first time the panel mounts.
  useEffect(() => {
    ask("Give me a full analysis summary of this business's recent performance");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-5 pb-4">
        {turns.map((turn, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-start gap-2.5 justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm text-white bg-brand-600">
                {turn.query}
              </div>
              <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon size={13} className="text-brand-400" />
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <Sparkles size={13} className="text-brand-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                {!turn.response && !turn.error && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-1.5">
                    <Loader2 size={13} className="animate-spin" /> Analyzing…
                  </div>
                )}
                {turn.error && (
                  <div className="flex items-start gap-2 text-xs text-red-400 rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>{turn.error}</span>
                  </div>
                )}
                {turn.response && <ResponseBlock response={turn.response} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Suggested prompts — only before the first exchange resolves */}
      {turns.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SUGGESTED_PROMPTS.map(p => (
            <button key={p} onClick={() => ask(p)} disabled={askMutation.isPending}
              className="text-[11px] px-2.5 py-1.5 rounded-full transition-colors"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              {p}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); ask(query); }} className="flex items-center gap-2 shrink-0">
        <input
          className="input flex-1 text-sm"
          placeholder="Ask Jwantra AI about your clinic's performance…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-primary !px-3.5" disabled={!query.trim() || askMutation.isPending}>
          {askMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
    </div>
  );
}

function ResponseBlock({ response }: { response: AIResponse }) {
  return (
    <>
      <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{response.answer}</p>

      {!!response.metrics?.length && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {response.metrics.map((m, i) => (
            <div key={i} className="card-elevated p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold truncate">{m.label}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-base font-semibold text-[var(--text-primary)] truncate">{m.value}</p>
                {m.delta && <TrendBadge delta={m.delta} trend={m.trend} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {!!response.charts?.length && (
        <div className="space-y-3">
          {response.charts.map((spec, i) => <JwantraChart key={i} spec={spec} />)}
        </div>
      )}

      {!!response.entities?.length && (
        <div className="flex flex-wrap gap-1.5">
          {response.entities.map((ent, i) => (
            <a key={i} href={`${JWANTRA_APP_URL}${ent.href}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full text-brand-400 hover:text-brand-300"
              style={{ background: 'rgba(14,157,232,0.08)', border: '1px solid rgba(14,157,232,0.18)' }}>
              {ent.label} <ExternalLink size={10} />
            </a>
          ))}
        </div>
      )}

      {!!response.actions?.length && (
        <div className="flex flex-wrap gap-2">
          {response.actions.map((act, i) => (
            act.type === 'navigate' ? (
              <a key={i} href={`${JWANTRA_APP_URL}${act.target}`} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-1.5 !px-3 text-xs">
                {act.label} <ExternalLink size={11} />
              </a>
            ) : (
              <span key={i} title="Available inside Jwantra" className="btn-secondary !py-1.5 !px-3 text-xs opacity-60 cursor-default">
                {act.label}
              </span>
            )
          ))}
        </div>
      )}

      {response.pending_confirmation && (
        <div className="flex items-start gap-2 text-xs rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
          <span className="text-amber-300">{response.pending_confirmation.message} Confirm this action from Jwantra directly.</span>
        </div>
      )}
    </>
  );
}

function TrendBadge({ delta, trend }: { delta: string; trend?: 'up' | 'down' | 'flat' }) {
  const color = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-[var(--text-muted)]';
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
      <Icon size={10} /> {delta}
    </span>
  );
}
