'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ImageOff, Check, Trash2, FileImage } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { galleryApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

// Cap how many gallery items get fetched/rendered at once — this is a
// "recent unattached photos" picker, not a full library browser. Keeps the
// payload (each item's bytes come across as base64, whether read over IPC
// on desktop or fetched as a blob on the web) and the grid itself fast
// even if a branch has accumulated a lot of images.
const MAX_ITEMS = 60;

interface PickerItem {
  id: string;
  fileName: string;
  mimeType: string;
  branchId: string;
  attachedPatientId: string | null;
  /** Electron gallery items use `addedAt`, web items use `createdAt` — normalized here so both sort the same way. */
  addedAt?: string;
  createdAt?: string;
}

/**
 * Most image formats render fine in a plain <img> tag, but a couple of the
 * formats this gallery accepts from x-ray sensors don't: DICOM has no
 * native browser image support at all, and TIFF is unreliable outside
 * Safari. Rather than showing a broken-image icon for these, the grid falls
 * back to a plain file icon + extension label.
 */
function canRenderInline(mimeType: string) {
  return mimeType.startsWith('image/') && mimeType !== 'image/tiff' && mimeType !== 'image/tif';
}

function extLabel(fileName: string) {
  const ext = fileName.split('.').pop();
  return ext ? ext.toUpperCase() : 'FILE';
}

/** Newest-added first — trusts addedAt/createdAt over whatever order the source returned, so the grid stays newest-first even if that ever changes upstream. */
function sortNewestFirst(items: PickerItem[]) {
  return [...items].sort((a, b) => {
    const at = new Date(a.addedAt || a.createdAt || 0).getTime();
    const bt = new Date(b.addedAt || b.createdAt || 0).getTime();
    return bt - at;
  });
}

interface Props {
  /** Initially-selected branch (usually the user's active branch). Every branch is still switchable from the dropdown below — a clinic with several branches, each with its own capture machine, needs to browse any of them, not just one. */
  branchId?: string;
  onClose: () => void;
  /** Called with the selected images' bytes (base64) plus their gallery ids, so the caller can upload them and then mark them attached. */
  onAttach: (files: { fileName: string; mimeType: string; data: string }[], galleryIds: string[]) => Promise<void>;
}

/** Converts a fetched Blob into a base64 string, so the web path can hand off images to the caller exactly the same shape the Electron IPC path already does. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string; // data:<mime>;base64,<data>
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function GalleryPickerModal({ branchId, onClose, onAttach }: Props) {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const { branches } = useAuthStore();

  const [selectedBranch, setSelectedBranch] = useState(branchId || '');
  const [items, setItems]     = useState<PickerItem[]>([]);
  const [thumbs, setThumbs]   = useState<Record<string, string>>({}); // id -> data URL
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attaching, setAttaching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Every branch the user has (branches is already scoped to what they're
  // assigned to by the auth store / backend) — lets them switch which
  // branch's gallery they're browsing without leaving the modal.
  const branchOptions = useMemo(() => branches.filter((b) => b.isActive), [branches]);

  useEffect(() => {
    setLoading(true);
    setSelected(new Set());

    const load = async () => {
      if (isElectron) {
        const list = await window.electronAPI!.listGalleryItems(selectedBranch || undefined);
        // Already-attached images live on the patient they were attached to
        // — no need to surface them here again. Only show what's still
        // waiting to be filed.
        const available = sortNewestFirst(list.filter((i) => !i.attachedPatientId)).slice(0, MAX_ITEMS);
        setItems(available);
        const entries = await Promise.all(available.map(async (item) => {
          // DICOM/TIFF can't be shown in an <img> tag — skip fetching bytes
          // for the thumbnail entirely and let the grid render its file-icon
          // fallback instead (see canRenderInline below).
          if (!canRenderInline(item.mimeType)) return [item.id, ''] as const;
          const full = await window.electronAPI!.readGalleryFile(item.id);
          return [item.id, full ? `data:${full.mimeType};base64,${full.data}` : ''] as const;
        }));
        setThumbs(Object.fromEntries(entries));
      } else {
        const res = await galleryApi.list(selectedBranch || undefined);
        const available = sortNewestFirst(res.data.filter((i) => !i.attachedPatientId)).slice(0, MAX_ITEMS);
        setItems(available);
        const entries = await Promise.all(available.map(async (item) => {
          if (!canRenderInline(item.mimeType)) return [item.id, ''] as const;
          try {
            const blobRes = await galleryApi.preview(item.id);
            const url = URL.createObjectURL(new Blob([blobRes.data], { type: item.mimeType }));
            return [item.id, url] as const;
          } catch {
            return [item.id, ''] as const;
          }
        }));
        setThumbs(Object.fromEntries(entries));
      }
    };

    load()
      .catch(() => toast.error('Could not load the gallery'))
      .finally(() => setLoading(false));
  }, [selectedBranch, isElectron]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /** Permanently removes a photo from the gallery (not just from this picker's list) — the file is deleted on disk (desktop) or on the server (web). */
  const handleDelete = async (e: MouseEvent, id: string) => {
    e.stopPropagation(); // don't toggle selection on the tile underneath
    setDeletingId(id);
    try {
      if (isElectron) {
        const result = await window.electronAPI!.removeGalleryItem(id);
        if (!result?.ok) throw new Error('Failed to delete');
      } else {
        await galleryApi.remove(id);
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      setThumbs((prev) => {
        const { [id]: removedUrl, ...rest } = prev;
        // Object URLs (web path) need to be released; data URLs (desktop
        // path) don't hold a browser resource, but revoking a data URL is
        // a harmless no-op, so it's simplest not to branch on it here.
        if (removedUrl && removedUrl.startsWith('blob:')) URL.revokeObjectURL(removedUrl);
        return rest;
      });
      setSelected((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Photo deleted');
    } catch {
      toast.error('Could not delete this photo');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAttach = async () => {
    if (!selected.size) return;
    setAttaching(true);
    try {
      const ids = Array.from(selected);
      const files = await Promise.all(ids.map(async (id) => {
        const item = items.find((i) => i.id === id)!;
        if (isElectron) {
          const dataUrl = thumbs[id] || '';
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
          return { fileName: item.fileName, mimeType: item.mimeType, data: base64 };
        }
        // Web path: thumbs[id] is an object URL, not a data URL — fetch the
        // bytes fresh (cheap; these are the same bytes the thumbnail already
        // pulled down) and re-encode as base64 so the caller's upload path
        // stays identical between desktop and web.
        const blobRes = await galleryApi.preview(id);
        const base64 = await blobToBase64(new Blob([blobRes.data], { type: item.mimeType }));
        return { fileName: item.fileName, mimeType: item.mimeType, data: base64 };
      }));
      await onAttach(files, ids);
      onClose();
    } finally {
      setAttaching(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Gallery</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {isElectron ? 'Photos pulled in from your watched folders' : 'Photos synced from your branch capture machines'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {branchOptions.length > 1 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-brand-500/50"
              >
                <option value="">All branches</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={14} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-[var(--text-muted)]" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <ImageOff size={28} className="mx-auto text-[var(--text-muted)] opacity-30 mb-3" />
              <p className="text-sm text-[var(--text-muted)]">No new photos waiting in the gallery</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {isElectron ? 'Set up a watched folder from Settings → Photo Sync' : 'Photos captured on a branch machine will appear here once synced'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map((item) => {
                const isSelected = selected.has(item.id);
                const isDeleting = deletingId === item.id;
                const renderable = canRenderInline(item.mimeType);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    disabled={isDeleting}
                    className={clsx(
                      'relative aspect-square rounded-lg overflow-hidden group border-2 transition-colors disabled:opacity-50',
                      isSelected ? 'border-brand-500' : 'border-transparent hover:border-[var(--border-hover)]',
                    )}
                  >
                    {renderable && thumbs[item.id] ? (
                      <img src={thumbs[item.id]} alt={item.fileName} className="w-full h-full object-cover" />
                    ) : renderable ? (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                        <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
                      </div>
                    ) : (
                      // DICOM / TIFF — no inline preview available, show a file-type badge instead of attempting a broken <img>.
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5" style={{ background: 'var(--bg-elevated)' }}>
                        <FileImage size={22} className="text-[var(--text-muted)]" />
                        <span className="text-[9px] font-semibold tracking-wide text-[var(--text-muted)]">{extLabel(item.fileName)}</span>
                      </div>
                    )}
                    <div className={clsx('absolute inset-0 transition-colors', isSelected ? 'bg-brand-500/25' : 'bg-black/0 group-hover:bg-black/10')} />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    {/* Delete — always reachable on touch devices, fades in on hover for pointer devices */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleDelete(e, item.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(e as any, item.id); }}
                      title="Delete photo"
                      className={clsx(
                        'absolute top-1.5 left-1.5 w-6 h-6 rounded-md flex items-center justify-center transition-opacity',
                        'bg-black/60 hover:bg-red-500/90 text-white opacity-0 group-hover:opacity-100 focus:opacity-100',
                        isSelected && 'opacity-100',
                      )}
                    >
                      {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </div>
                    <p
                      className="absolute bottom-0 inset-x-0 px-1.5 py-1 text-[9px] text-white truncate text-left"
                      style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}
                    >
                      {item.fileName}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs text-[var(--text-muted)]">{selected.size} selected</p>
          <button
            onClick={handleAttach}
            disabled={!selected.size || attaching}
            className="btn-primary text-xs py-2 px-4 disabled:opacity-50 gap-1.5"
          >
            {attaching && <Loader2 size={13} className="animate-spin" />}
            {attaching ? 'Attaching…' : `Attach${selected.size ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
