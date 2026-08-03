'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ImageOff, Check } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

// Cap how many gallery items get fetched/rendered at once — this is a
// "recent unattached photos" picker, not a full library browser. Keeps the
// IPC payload (each item's bytes come across as base64) and the grid
// itself fast even if a folder has accumulated a lot of images.
const MAX_ITEMS = 60;

interface Props {
  /** Only show images tagged for this branch (electron/gallery-store.js tags each item with the branch active in Settings > Photo Sync at the time it was pulled in). */
  branchId?: string;
  onClose: () => void;
  /** Called with the selected images' bytes (base64) plus their gallery ids, so the caller can upload them and then mark them attached. */
  onAttach: (files: { fileName: string; mimeType: string; data: string }[], galleryIds: string[]) => Promise<void>;
}

export default function GalleryPickerModal({ branchId, onClose, onAttach }: Props) {
  const [items, setItems]     = useState<ElectronGalleryItem[]>([]);
  const [thumbs, setThumbs]   = useState<Record<string, string>>({}); // id -> data URL
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) { setLoading(false); return; }
    window.electronAPI.listGalleryItems(branchId)
      .then(async (list) => {
        // Already-attached images live on the patient they were attached to
        // — no need to surface them here again ("no need to pull the
        // synced images"). Only show what's still waiting to be filed.
        const available = list.filter((i) => !i.attachedPatientId).slice(0, MAX_ITEMS);
        setItems(available);
        const entries = await Promise.all(available.map(async (item) => {
          const full = await window.electronAPI!.readGalleryFile(item.id);
          return [item.id, full ? `data:${full.mimeType};base64,${full.data}` : ''] as const;
        }));
        setThumbs(Object.fromEntries(entries));
      })
      .catch(() => toast.error('Could not load the gallery'))
      .finally(() => setLoading(false));
  }, [branchId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAttach = async () => {
    if (!selected.size) return;
    setAttaching(true);
    try {
      const ids = Array.from(selected);
      const files = ids.map((id) => {
        const item = items.find((i) => i.id === id)!;
        const dataUrl = thumbs[id] || '';
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
        return { fileName: item.fileName, mimeType: item.mimeType, data: base64 };
      });
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
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Gallery</p>
            <p className="text-[11px] text-[var(--text-muted)]">Photos pulled in from your watched folder</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-[var(--text-muted)]" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <ImageOff size={28} className="mx-auto text-[var(--text-muted)] opacity-30 mb-3" />
              <p className="text-sm text-[var(--text-muted)]">No new photos waiting in the gallery</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Set up a watched folder from Settings → Photo Sync</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={clsx(
                      'relative aspect-square rounded-lg overflow-hidden group border-2 transition-colors',
                      isSelected ? 'border-brand-500' : 'border-transparent hover:border-[var(--border-hover)]',
                    )}
                  >
                    {thumbs[item.id] ? (
                      <img src={thumbs[item.id]} alt={item.fileName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                        <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
                      </div>
                    )}
                    <div className={clsx('absolute inset-0 transition-colors', isSelected ? 'bg-brand-500/25' : 'bg-black/0 group-hover:bg-black/10')} />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
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