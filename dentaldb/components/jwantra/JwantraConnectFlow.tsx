'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Sparkles, Copy, Check, ExternalLink, Loader2, ShieldCheck, KeyRound, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jwantraApi } from '@/lib/api';

interface Props {
  /** Result of GET /integrations/jwantra/status */
  status: {
    connected: boolean;
    aiLinked: boolean;
    tokenPrefix?: string;
  };
}

/**
 * Step 1: generate the ClinicKarobar->Jwantra integration token (lets
 * Jwantra pull this clinic's data). Step 2: paste a Jwantra API key
 * (generated on Jwantra's own Settings > API Keys page) so ClinicKarobar
 * can call OUT to Jwantra's AI. Both steps use the existing
 * integrations/jwantra endpoints — nothing here is faked.
 */
export default function JwantraConnectFlow({ status }: Props) {
  const qc = useQueryClient();
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const connectMutation = useMutation({
    mutationFn: () => jwantraApi.connect(),
    onSuccess: (res) => {
      setIssuedToken(res.data.token);
      qc.invalidateQueries({ queryKey: ['jwantra-status'] });
      toast.success('Integration token generated');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to connect to Jwantra'),
  });

  const linkMutation = useMutation({
    mutationFn: () => jwantraApi.linkApiKey(apiKeyInput.trim()),
    onSuccess: () => {
      setApiKeyInput('');
      qc.invalidateQueries({ queryKey: ['jwantra-status'] });
      toast.success('Jwantra AI linked — you can now ask questions right here');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to link API key'),
  });

  const copyToken = () => {
    if (!issuedToken) return;
    navigator.clipboard.writeText(issuedToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center mb-2">
        <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
          <img src="/logo.png" alt="Jwantra Logo" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] font-display">Connect Jwantra AI</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1 max-w-md mx-auto">
          Jwantra is ClinicKarobar's sibling AI analytics product. Connect it once and see
          revenue forecasts, no-show risk, and other AI analysis right here — no need to leave this app.
        </p>
      </div>

      {/* Step 1 */}
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <StepBadge done={status.connected} n={1} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Share your clinic's data with Jwantra</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-3">
              Generates a read-only token so Jwantra can sync your patients, services, and invoices.
              You can revoke it anytime from here.
            </p>

            {!status.connected && !issuedToken && (
              <button className="btn-primary text-xs" onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
                {connectMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                Generate integration token
              </button>
            )}

            {status.connected && !issuedToken && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <Check size={13} /> Connected {status.tokenPrefix ? `(token ${status.tokenPrefix}…)` : ''}
              </div>
            )}

            {issuedToken && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-3 mt-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold mb-1.5">
                  Your token (shown once — copy it now)
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-brand-400 break-all">{issuedToken}</code>
                  <button onClick={copyToken} className="btn-ghost !p-1.5 shrink-0" title="Copy">
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-2">
                  You won't need to paste this anywhere — Jwantra reads it automatically once you add
                  ClinicKarobar as a connector on Jwantra's side using this clinic's URL and this token.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="card p-5" style={{ opacity: status.connected ? 1 : 0.5 }}>
        <div className="flex items-start gap-3">
          <StepBadge done={status.aiLinked} n={2} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Link your Jwantra API key</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-3">
              This is what lets the AI analysis show up on this page. Generate a key from{' '}
              <span className="text-[var(--text-secondary)] font-medium">Jwantra → Settings → API Keys</span>{' '}
              (requires a Jwantra Pro plan), then paste it below. ClinicKarobar stores it encrypted and only
              uses it server-side — your browser never holds onto it.
            </p>

            {status.aiLinked ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <Check size={13} /> Jwantra AI linked
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="input flex-1 text-xs font-mono"
                  placeholder="jwk_live_…"
                  value={apiKeyInput}
                  disabled={!status.connected}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
                <button
                  className="btn-primary text-xs shrink-0"
                  disabled={!status.connected || !apiKeyInput.trim() || linkMutation.isPending}
                  onClick={() => linkMutation.mutate()}
                >
                  {linkMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                  Link key
                </button>
              </div>
            )}

            <a
              href="https://app.jwantra.com/dashboard/settings?tab=api-keys"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 mt-3"
            >
              Open Jwantra to generate a key <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      {status.connected && status.aiLinked && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] pt-2">
          Both steps complete <ArrowRight size={12} /> refresh to see your analysis
        </div>
      )}
    </div>
  );
}

function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5"
      style={{
        background: done ? 'rgba(34,197,94,0.15)' : 'var(--bg-elevated)',
        color: done ? '#22c55e' : 'var(--text-secondary)',
        border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
      }}
    >
      {done ? <Check size={13} /> : n}
    </div>
  );
}
