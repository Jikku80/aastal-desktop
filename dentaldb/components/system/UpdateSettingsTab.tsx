'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Info, Loader2, CheckCircle2, AlertTriangle, DownloadCloud, RefreshCw, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Settings > Updates — only meaningful on the Electron desktop build.
 * Background checks already run on their own timer (see
 * electron/auto-update.js) whether or not anyone opens this screen — this
 * tab exists so the process isn't entirely invisible: it shows the current
 * app version, lets the user trigger a check on demand, watches
 * 'update:status' events live (checking → available → downloading →
 * downloaded), and offers a "Restart & Install" button once a download has
 * finished, instead of only ever getting a background dialog.
 */
export default function UpdateSettingsTab() {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const [version, setVersion] = useState('');
  const [status, setStatus] = useState<ElectronUpdateStatus>({ state: 'idle' });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI!.getAppVersion().then(setVersion).catch(() => {});
    window.electronAPI!.getUpdateStatus().then(setStatus).catch(() => {});
    const unsubscribe = window.electronAPI!.onUpdateStatus((s) => {
      setStatus(s);
      if (s.state === 'checking') setChecking(true);
      else setChecking(false);
    });
    return unsubscribe;
  }, [isElectron]);

  const handleCheck = async () => {
    if (!window.electronAPI) return;
    setChecking(true);
    try {
      await window.electronAPI.checkForUpdates();
    } catch {
      toast.error('Could not check for updates');
      setChecking(false);
    }
  };

  const handleInstall = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.installUpdate();
  };

  if (!isElectron) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">Updates</h3>
          <p className="text-sm text-[var(--text-muted)]">App updates only apply to the Aastal desktop app</p>
        </div>
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
          <Info size={13} className="text-brand-400 shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)]">
            You're using the web app — it's always on the latest version, nothing to update here.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Updates</h3>
        <p className="text-sm text-[var(--text-muted)]">
          {version ? `You're running Aastal ${version}` : 'Checking your current version…'}
        </p>
      </div>

      {/* Live status */}
      <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {statusIcon(status.state)}
        <span className="text-[var(--text-secondary)] flex-1">{statusLabel(status)}</span>
        {status.state === 'downloading' && typeof status.percent === 'number' && (
          <span className="text-[var(--text-muted)] font-medium">{status.percent}%</span>
        )}
      </div>

      {status.state === 'downloading' && typeof status.percent === 'number' && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${status.percent}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-2.5">
        {status.state === 'downloaded' ? (
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            <RotateCw size={14} />
            Restart & Install
          </button>
        ) : (
          <button
            onClick={handleCheck}
            disabled={checking || status.state === 'downloading'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-elevated)] disabled:opacity-60 transition-colors"
          >
            {checking || status.state === 'checking' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {checking || status.state === 'checking' ? 'Checking…' : 'Check for updates'}
          </button>
        )}
      </div>

      {status.state === 'error' && status.error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)]">{status.error}</p>
        </div>
      )}

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
        style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
        <Info size={13} className="text-brand-400 shrink-0 mt-0.5" />
        <p className="text-[var(--text-secondary)]">
          Aastal also checks for updates automatically in the background every few hours. When one's
          ready, it'll ask if you want to restart now or install it next time you close the app.
        </p>
      </div>
    </motion.div>
  );
}

function statusIcon(state: ElectronUpdateStatus['state']) {
  switch (state) {
    case 'checking':
      return <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />;
    case 'available':
    case 'downloading':
      return <DownloadCloud size={14} className="text-brand-400" />;
    case 'downloaded':
      return <CheckCircle2 size={14} className="text-emerald-400" />;
    case 'error':
      return <AlertTriangle size={14} className="text-red-400" />;
    case 'not-available':
      return <CheckCircle2 size={14} className="text-emerald-400" />;
    default:
      return <Info size={14} className="text-[var(--text-muted)]" />;
  }
}

function statusLabel(status: ElectronUpdateStatus) {
  switch (status.state) {
    case 'checking':
      return 'Checking for updates…';
    case 'available':
      return `Update available${status.info?.version ? ` — v${status.info.version}` : ''}, downloading…`;
    case 'downloading':
      return `Downloading update${status.info?.version ? ` v${status.info.version}` : ''}…`;
    case 'downloaded':
      return `Update ready${status.info?.version ? ` — v${status.info.version}` : ''}. Restart to install.`;
    case 'not-available':
      return "You're on the latest version";
    case 'error':
      return 'Could not check for updates';
    case 'unavailable':
      return 'Updates are only available in an installed build (not dev mode)';
    default:
      return 'Update status unknown yet';
  }
}
