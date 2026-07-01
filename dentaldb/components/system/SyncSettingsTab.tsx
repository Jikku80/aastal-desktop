'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Info, Loader2, CheckCircle2, AlertTriangle, RefreshCw, ChevronDown, Laptop, ShieldOff, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { syncApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const OWNER_ROLES = new Set(['owner', 'super_admin']);

interface SyncDevice {
  id: string;
  deviceName: string;
  tokenPrefix: string;
  status: 'active' | 'revoked';
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/**
 * Settings > Sync — only meaningful on the Electron desktop build, where
 * the local SQLite-backed backend needs to know which remote (hosted)
 * backend to sync against. On the web build, window.electronAPI is
 * undefined and this renders an explanatory message instead.
 *
 * There's no manual sync key to type in anymore. On first successful
 * online login, the backend auto-registers this device against the remote
 * (POST /sync/register-device, JWT-authenticated — see
 * AuthService.login's auto-registration hook) and every request after
 * that is scoped to this clinic by that per-device token
 * (SyncDeviceGuard). This tab just reports whether that's happened, and
 * — for owners/admins — lists every registered device for the clinic with
 * a revoke button for a lost/stolen laptop.
 *
 * The remote URL is auto-configured out of the box (DEFAULT_REMOTE_BASE_URL
 * in electron/sync-config.js) — shown here for visibility/troubleshooting
 * and as an override for staging/self-hosted setups, behind an "Advanced"
 * toggle.
 */
export default function SyncSettingsTab() {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const { user } = useAuthStore();
  const isOwner = OWNER_ROLES.has(user?.role ?? '');

  const [remoteBaseUrl, setRemoteBaseUrl] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [hasDeviceToken, setHasDeviceToken] = useState(false);
  const [loading, setLoading] = useState(isElectron);
  const [saving, setSaving] = useState(false);
  const [reregistering, setReregistering] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const status = useOnlineStatus();
  const queryClient = useQueryClient();

  const loadConfig = () => {
    if (!isElectron) return;
    window.electronAPI!.getSyncConfig()
      .then((cfg) => {
        setRemoteBaseUrl(cfg.remoteBaseUrl);
        setHasDeviceToken(cfg.hasDeviceToken);
        setIsDefault(cfg.isDefault);
      })
      .catch(() => toast.error('Could not read sync settings'))
      .finally(() => setLoading(false));
  };

  useEffect(loadConfig, [isElectron]);

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['sync-devices'],
    queryFn: async () => (await syncApi.devices()).data as SyncDevice[],
    enabled: isOwner,
    retry: false,
  });

  const handleSave = async () => {
    if (!window.electronAPI) return;
    if (remoteBaseUrl && !/^https?:\/\//i.test(remoteBaseUrl)) {
      toast.error('Remote URL must start with http:// or https://');
      return;
    }
    setSaving(true);
    try {
      const result = await window.electronAPI.setSyncConfig({ remoteBaseUrl });
      if (result.ok) {
        toast.success('Sync settings saved — local backend restarted');
        setIsDefault(false);
        loadConfig();
      } else {
        toast.error(`Failed to apply: ${result.error || 'unknown error'}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save sync settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReregister = async () => {
    if (!window.electronAPI) return;
    setReregistering(true);
    try {
      const result = await window.electronAPI.reregisterSyncDevice();
      if (result.ok) {
        toast.success('Device token cleared — sign in again to re-register');
        loadConfig();
      } else {
        toast.error(`Failed: ${result.error || 'unknown error'}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to re-register device');
    } finally {
      setReregistering(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await syncApi.revokeDevice(id);
      toast.success('Device revoked');
      queryClient.invalidateQueries({ queryKey: ['sync-devices'] });
    } catch {
      toast.error('Failed to revoke device');
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

        {isOwner && <RegisteredDevicesList devices={devices} loading={devicesLoading} onRevoke={handleRevoke} />}
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

      {/* Device registration status — replaces the old manual "Sync Key" field entirely */}
      {hasDeviceToken ? (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)]">
            This device is registered for sync — it authenticates automatically, no key needed.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
          <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)]">
            This device hasn't registered for sync yet. It registers itself automatically the next
            time you sign in while online — nothing to type in.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ChevronDown size={13} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        Advanced — change server URL or re-register
      </button>

      {showAdvanced && (
        <div className="space-y-4">
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

          {hasDeviceToken && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleReregister}
                disabled={reregistering}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-elevated)] disabled:opacity-60 transition-colors"
              >
                {reregistering ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Clear device token & re-register
              </button>
              <p className="text-[11px] text-[var(--text-muted)]">
                Use this if an administrator revoked this device — it'll register fresh next time you sign in.
              </p>
            </div>
          )}
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

      {isOwner && <RegisteredDevicesList devices={devices} loading={devicesLoading} onRevoke={handleRevoke} />}
    </motion.div>
  );
}

/**
 * Admin-only "lost/stolen laptop" screen — lists every device registered
 * for this clinic (GET /sync/devices) with a revoke button per row
 * (POST /sync/devices/:id/revoke). Visible to owners/super_admins on both
 * the web and desktop builds, since revoking is a clinic-wide action that
 * doesn't depend on which device you're currently using.
 */
function RegisteredDevicesList({
  devices, loading, onRevoke,
}: {
  devices?: SyncDevice[];
  loading: boolean;
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-[var(--border)]">
      <div className="pt-3">
        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-1">Registered Devices</h4>
        <p className="text-xs text-[var(--text-muted)]">
          Every desktop install that has registered for sync. Revoke a device if a laptop is lost or stolen —
          it immediately loses access to pull or push this clinic's data.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : !devices?.length ? (
        <p className="text-xs text-[var(--text-muted)] py-2">No devices registered yet.</p>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Laptop size={15} className={d.status === 'active' ? 'text-brand-400' : 'text-[var(--text-muted)]'} />
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{d.deviceName}</p>
                  <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <Clock size={10} />
                    {d.lastUsedAt ? `Last used ${new Date(d.lastUsedAt).toLocaleString()}` : `Registered ${new Date(d.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              {d.status === 'revoked' ? (
                <span className="text-[11px] text-[var(--text-muted)] shrink-0 px-2 py-1">Revoked</span>
              ) : (
                <button
                  onClick={() => onRevoke(d.id)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-red-400 hover:text-red-300 shrink-0 px-2 py-1"
                >
                  <ShieldOff size={12} />
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
