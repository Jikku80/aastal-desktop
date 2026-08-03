'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Loader2, CheckCircle2, AlertTriangle, FolderOpen, Plus, Trash2, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';

/**
 * Settings > Photo Sync — only meaningful on the Electron desktop build.
 * A clinic can have several branches, each with its own machine capturing
 * x-rays/photos — so this lets the user configure one watched folder PER
 * branch, all watched simultaneously (see electron/watched-folder.js): the
 * moment a new image lands in any of them, it's copied into the app's own
 * gallery tagged with that folder's branch and, if a patient is currently
 * open, the user is prompted to attach it right away (see
 * WatchedFolderListener.tsx). Everything else — browsing the gallery,
 * attaching images to a specific patient — happens from the Files panel
 * on a patient's page, not here.
 */
export default function WatchedFolderSettingsTab() {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const { branches } = useAuthStore();

  const [loading, setLoading] = useState(isElectron);
  const [entries, setEntries] = useState<ElectronWatchedFolderEntry[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // "New row" draft state — kept separate from the saved list so a
  // partially-filled new entry doesn't render as if it were already saved.
  const [addingNew, setAddingNew] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [newBranchId, setNewBranchId] = useState('');

  const loadEntries = () => {
    if (!isElectron) return;
    window.electronAPI!.listWatchedFolders()
      .then(setEntries)
      .catch(() => toast.error('Could not read photo sync settings'))
      .finally(() => setLoading(false));
  };

  useEffect(loadEntries, [isElectron]);

  // Branches that don't already have a watched folder configured — the
  // main.js store enforces one entry per branch, so only offer the ones
  // still available when starting a new row.
  const unconfiguredBranches = branches.filter((b) => !entries.some((e) => e.branchId === b.id));

  const handleBrowseForNew = async () => {
    if (!window.electronAPI) return;
    const picked = await window.electronAPI.pickWatchedFolder();
    if (picked) setNewFolderPath(picked);
  };

  const handleAdd = async () => {
    if (!window.electronAPI) return;
    if (!newFolderPath) { toast.error('Choose a folder first'); return; }
    if (!newBranchId) { toast.error('Choose which branch these photos belong to'); return; }
    const branch = branches.find((b) => b.id === newBranchId);
    setSavingId('__new__');
    try {
      const result = await window.electronAPI.addWatchedFolder({
        folderPath: newFolderPath,
        branchId: newBranchId,
        branchName: branch?.name || '',
        enabled: true,
      });
      if (result.ok) {
        toast.success(`Now watching for ${branch?.name || 'this branch'}`);
        setAddingNew(false);
        setNewFolderPath('');
        setNewBranchId('');
        loadEntries();
      } else {
        toast.error(result.error || 'Failed to add watched folder');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add watched folder');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggle = async (entry: ElectronWatchedFolderEntry) => {
    if (!window.electronAPI) return;
    setSavingId(entry.id);
    try {
      const result = await window.electronAPI.updateWatchedFolder(entry.id, { enabled: !entry.enabled });
      if (result.ok) {
        loadEntries();
      } else {
        toast.error(result.error || 'Failed to update');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleRebrowse = async (entry: ElectronWatchedFolderEntry) => {
    if (!window.electronAPI) return;
    const picked = await window.electronAPI.pickWatchedFolder();
    if (!picked) return;
    setSavingId(entry.id);
    try {
      const result = await window.electronAPI.updateWatchedFolder(entry.id, { folderPath: picked });
      if (result.ok) {
        toast.success('Folder updated');
        loadEntries();
      } else {
        toast.error(result.error || 'Failed to update folder');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleRemove = async (entry: ElectronWatchedFolderEntry) => {
    if (!window.electronAPI) return;
    setSavingId(entry.id);
    try {
      const result = await window.electronAPI.removeWatchedFolder(entry.id);
      if (result.ok) {
        toast.success(`Stopped watching for ${entry.branchName || 'this branch'}`);
        loadEntries();
      } else {
        toast.error(result.error || 'Failed to remove');
      }
    } finally {
      setSavingId(null);
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
            each branch's capture machine can point Aastal at its own folder (e.g. where an x-ray sensor
            or camera importer drops photos) and automatically pull new images into a patient's file
            gallery. Photos synced this way are also visible here on the web, from a patient's Files tab
            → "Choose from Gallery".
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
          Watch a local folder per branch and pull new photos straight into that branch's gallery
        </p>
      </div>

      {/* One row per configured branch */}
      <div className="space-y-2.5">
        {entries.map((entry) => (
          <div key={entry.id} className="p-3.5 rounded-xl space-y-2.5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {entry.isWatching ? (
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                )}
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.branchName || 'Unnamed branch'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={() => handleToggle(entry)}
                  disabled={savingId === entry.id}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(entry)}
                  disabled={savingId === entry.id}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Stop watching this branch"
                >
                  {savingId === entry.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="flex-1 px-3 py-2 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] truncate">
                {entry.folderPath || 'No folder selected'}
              </p>
              <button
                type="button"
                onClick={() => handleRebrowse(entry)}
                disabled={savingId === entry.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors shrink-0 disabled:opacity-50"
              >
                <FolderOpen size={13} /> Change…
              </button>
            </div>
          </div>
        ))}

        {entries.length === 0 && !addingNew && (
          <div className="text-center py-8">
            <ImagePlus size={24} className="mx-auto text-[var(--text-muted)] opacity-30 mb-2" />
            <p className="text-xs text-[var(--text-muted)]">No branches are watching a folder yet</p>
          </div>
        )}
      </div>

      {/* Add a new branch's watched folder */}
      <AnimatePresence>
        {addingNew ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-xl space-y-2.5" style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-hover)' }}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Branch</label>
              <select
                value={newBranchId}
                onChange={(e) => setNewBranchId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-brand-500/50"
              >
                <option value="">Select a branch…</option>
                {unconfiguredBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Watched folder</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderPath}
                  readOnly
                  placeholder="No folder selected"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] truncate"
                />
                <button
                  type="button"
                  onClick={handleBrowseForNew}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors shrink-0"
                >
                  <FolderOpen size={13} /> Browse…
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Point this at wherever that branch's x-ray sensor, camera, or phone-sync tool drops photos.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={savingId === '__new__'}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
              >
                {savingId === '__new__' && <Loader2 size={13} className="animate-spin" />}
                Save branch folder
              </button>
              <button
                onClick={() => { setAddingNew(false); setNewFolderPath(''); setNewBranchId(''); }}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingNew(true)}
            disabled={unconfiguredBranches.length === 0}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] border border-dashed border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> {unconfiguredBranches.length === 0 ? 'Every branch already has a watched folder' : 'Add a branch\'s watched folder'}
          </button>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
        style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
        <ImagePlus size={13} className="text-brand-400 shrink-0 mt-0.5" />
        <p className="text-[var(--text-secondary)]">
          Each branch's photos are kept separate — new images are tagged with the branch whose folder they
          landed in, and pushed up so they're visible from the web too. While a patient's file panel is
          open, a new photo prompts you to attach it right away. Otherwise it waits in the gallery — open
          any patient's Files tab and choose "Gallery" to pick from it later.
        </p>
      </div>
    </motion.div>
  );
}
