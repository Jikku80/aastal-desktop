'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Info, Loader2, CheckCircle2, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Settings > Sync — only meaningful on the Electron desktop build, where
 * the local SQLite-backed backend needs to know which remote (hosted)
 * backend to sync against. On the web build, window.electronAPI is
 * undefined and this renders an explanatory message instead of a form.
 *
 * The remote URL is auto-configured out of the box (DEFAULT_REMOTE_BASE_URL
 * in electron/sync-config.js) — most clinics never need to touch this tab.
 * It's shown here for visibility/troubleshooting and as an override for
 * staging/self-hosted setups, behind an "Advanced" toggle.
 *
 * Saving restarts the local backend process (via IPC, see electron/main.js
 * restartBackend()) so the change take effect immediately — no full app
 * relaunch needed.
 */
export default function SyncSettingsTab() {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const [remoteBaseUrl, setRemoteBaseUrl] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [sharedSecret, setSharedSecret] = useState('');
  const [hasSavedSecret, setHasSavedSecret] = useState(false);
  const [loading, setLoading] = useState(isElectron);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const status = useOnlineStatus();

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI!.getSyncConfig()
      .then((cfg) => {
        setRemoteBaseUrl(cfg.remoteBaseUrl);
        setHasSavedSecret(cfg.hasSecret);
        setIsDefault(cfg.isDefault);
      })
      .catch(() => toast.error('Could not read sync settings'))
      .finally(() => setLoading(false));
  }, [isElectron]);

  const handleSave = async () => {
    if (!window.electronAPI) return;
    if (remoteBaseUrl && !/^https?:\/\//i.test(remoteBaseUrl)) {
      toast.error('Remote URL must start with http:// or https://');
      return;
    }
    setSaving(true);
    try {
      // Empty string = "leave existing secret untouched" (see preload.js doc).
      const result = await window.electronAPI.setSyncConfig({
        remoteBaseUrl,
        sharedSecret: sharedSecret || undefined,
      });
      if (result.ok) {
        toast.success('Sync settings saved — local backend restarted');
        setHasSavedSecret(hasSavedSecret || !!sharedSecret);
        setIsDefault(false);
        setSharedSecret('');
      } else {
        toast.error(`Failed to apply: ${result.error || 'unknown error'}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save sync settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isElectron) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">Sync</h3>
          <p className="text-sm text-[var(--text-muted)]">Cloud sync settings only apply to the Aastal desktop app</p>
        </div>
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
          <Info size={13} className="text-brand-400 shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)]">
            You're using the web app, which always talks to the live database directly — there's nothing to sync here.
            This tab is for the offline-capable desktop app only.
          </p>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Sync</h3>
        <p className="text-sm text-[var(--text-muted)]">This device syncs automatically with the hosted Aastal backend</p>
      </div>

      {/* Live status */}
      <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {status.isLoading ? (
          <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />
        ) : status.isOnline ? (
          <CheckCircle2 size={14} className="text-emerald-400" />
        ) : (
          <AlertTriangle size={14} className="text-amber-400" />
        )}
        <span className="text-[var(--text-secondary)]">
          {status.isLoading
            ? 'Checking connection…'
            : status.isOnline
            ? `Online${status.lastSyncAt ? ` — last synced ${new Date(status.lastSyncAt).toLocaleString()}` : ' — not yet synced'}`
            : 'Offline — working from local data'}
          {status.totalPending > 0 ? ` · ${status.totalPending} record(s) waiting to sync` : ''}
          {status.totalConflict > 0 ? ` · ${status.totalConflict} conflict(s) need review` : ''}
        </span>
      </div>

      {!hasSavedSecret && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
          <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)]">
            No sync key set yet — this device can tell it's online, but won't push or pull patient data until
            an administrator provides a sync key for your clinic. Ask them, or enter it below.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">Sync Key</label>
        <input
          type="password"
          value={sharedSecret}
          onChange={(e) => setSharedSecret(e.target.value)}
          placeholder={hasSavedSecret ? '•••••••••••••• (saved — leave blank to keep)' : 'Provided by your administrator'}
          className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-500/50"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ChevronDown size={13} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        Advanced — change server URL
      </button>

      {showAdvanced && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Remote API URL</label>
          <input
            type="text"
            value={remoteBaseUrl}
            onChange={(e) => setRemoteBaseUrl(e.target.value)}
            placeholder="https://clinickarobar.com"
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-500/50"
          />
          <p className="text-[11px] text-[var(--text-muted)]">
            {isDefault ? 'Currently using the built-in default. ' : ''}
            Only change this for staging or a self-hosted deployment.
          </p>
        </div>
      )}

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
        style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
        <Info size={13} className="text-brand-400 shrink-0 mt-0.5" />
        <p className="text-[var(--text-secondary)]">
          Saving restarts this device's local backend to apply the change — the app stays open, but
          you may see a brief "offline" flash while it restarts.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {saving ? 'Saving & restarting…' : 'Save & Apply'}
      </button>
    </motion.div>
  );
}
