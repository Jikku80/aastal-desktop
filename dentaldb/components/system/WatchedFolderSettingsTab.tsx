'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Info, Loader2, CheckCircle2, AlertTriangle, FolderOpen, Save, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';

/**
 * Settings > Photo Sync — only meaningful on the Electron desktop build.
 * Lets a clinic point the app at a local folder (e.g. where a phone-sync
 * tool or SD-card importer drops photos) and pick which branch newly
 * detected images should be filed under. The Electron main process then
 * watches that folder continuously (see electron/watched-folder.js): the
 * moment a new image lands, it's copied into the app's own gallery and,
 * if a patient is currently open, the user is prompted to attach it right
 * away (see WatchedFolderListener.tsx). Everything else — browsing the
 * gallery, attaching images to a specific patient — happens from the
 * Files panel on a patient's page, not here.
 */
export default function WatchedFolderSettingsTab() {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const { branches } = useAuthStore();

  const [loading, setLoading]         = useState(isElectron);
  const [saving, setSaving]           = useState(false);
  const [folderPath, setFolderPath]   = useState('');
  const [branchId, setBranchId]       = useState('');
  const [enabled, setEnabled]         = useState(false);
  const [isWatching, setIsWatching]   = useState(false);

  const loadConfig = () => {
    if (!isElectron) return;
    window.electronAPI!.getWatchedFolderConfig()
      .then((cfg) => {
        setFolderPath(cfg.folderPath);
        setBranchId(cfg.branchId);
        setEnabled(cfg.enabled);
        setIsWatching(cfg.isWatching);
      })
      .catch(() => toast.error('Could not read photo sync settings'))
      .finally(() => setLoading(false));
  };

  useEffect(loadConfig, [isElectron]);

  const handleBrowse = async () => {
    if (!window.electronAPI) return;
    const picked = await window.electronAPI.pickWatchedFolder();
    if (picked) setFolderPath(picked);
  };

  const handleSave = async () => {
    if (!window.electronAPI) return;
    if (enabled && !folderPath) {
      toast.error('Choose a folder first');
      return;
    }
    if (enabled && !branchId) {
      toast.error('Choose which branch new photos belong to');
      return;
    }
    const branch = branches.find((b) => b.id === branchId);
    setSaving(true);
    try {
      const result = await window.electronAPI.setWatchedFolderConfig({
        folderPath,
        branchId,
        branchName: branch?.name || '',
        enabled,
      });
      if (result.ok) {
        toast.success(enabled ? 'Watching folder for new photos' : 'Photo sync saved');
        loadConfig();
      } else {
        toast.error(`Failed to save: ${result.error || 'unknown error'}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save photo sync settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isElectron) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">Photo Sync</h3>
          <p className="text-sm text-[var(--text-muted)]">Watched-folder auto-import only applies to the Aastal desktop app</p>
        </div>
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
          <Info size={13} className="text-brand-400 shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)]">
            You're using the web app — there's no local filesystem to watch here. On the desktop app,
            this tab lets you point Aastal at a folder (e.g. where your phone or camera syncs photos)
            and automatically pull new images into a patient's file gallery.
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
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Photo Sync</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Watch a local folder for new photos and pull them straight into your gallery
        </p>
      </div>

      {/* Live status */}
      <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {isWatching ? (
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
        ) : (
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
        )}
        <span className="text-[var(--text-secondary)]">
          {isWatching
            ? `Watching "${folderPath}" — new images are pulled in automatically`
            : 'Not currently watching any folder'}
        </span>
      </div>

      {/* Enable toggle */}
      <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl cursor-pointer"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Enable photo sync</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Turn off to stop watching without losing your folder/branch settings</p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-brand-500 shrink-0"
        />
      </label>

      {/* Folder picker */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">Watched folder</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={folderPath}
            readOnly
            placeholder="No folder selected"
            className="flex-1 px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] truncate"
          />
          <button
            type="button"
            onClick={handleBrowse}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors shrink-0"
          >
            <FolderOpen size={13} /> Browse…
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          Point this at wherever your phone-sync tool or camera importer drops photos (e.g. a Dropbox/Google Drive
          folder, or a dedicated "Clinic Photos" folder).
        </p>
      </div>

      {/* Branch picker */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">New photos belong to</label>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-brand-500/50"
        >
          <option value="">Select a branch…</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <p className="text-[11px] text-[var(--text-muted)]">
          Incoming photos are added to this branch's gallery until you attach them to a specific patient.
        </p>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
        style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
        <ImagePlus size={13} className="text-brand-400 shrink-0 mt-0.5" />
        <p className="text-[var(--text-secondary)]">
          While a patient's file panel is open, a new photo prompts you to attach it right away. Otherwise it
          waits in the gallery — open any patient's Files tab and choose "Gallery" to pick from it later.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Saving…' : 'Save'}
      </button>
    </motion.div>
  );
}