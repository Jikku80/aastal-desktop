'use client';
import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image, File, Trash2, Download, Loader2, Eye, X, FileSpreadsheet, ImagePlus, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { filesApi, galleryApi, BASE_URL } from '@/lib/api';
import { ActionIconButton, ActionIconGroup } from '@/components/ui/ActionIconButton';
import { clsx } from 'clsx';
import GalleryPickerModal from '@/components/files/GalleryPickerModal';
import { base64ToFile } from '@/lib/electronFiles';
import { useAuthStore } from '@/store/auth.store';

// Desktop-only extras (gallery + native folder picker). Both no-op /
// gracefully fall back on the web build, where window.electronAPI is
// undefined.
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

const CATEGORIES = ['xray','report','document','image','other'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_ICONS: Record<Category, any> = {
  xray: FileText, report: FileText, document: FileText, image: Image, other: File,
};
const CATEGORY_COLORS: Record<Category, string> = {
  xray:     'text-brand-400 bg-brand-500/10',
  report:   'text-blue-400 bg-blue-500/10',
  document: 'text-amber-400 bg-amber-500/10',
  image:    'text-emerald-400 bg-emerald-500/10',
  other:    'text-gray-400 bg-gray-500/10',
};

const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.svg,.pdf,.xlsx,.xls,.csv,.doc,.docx,.dcm,.dicom';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string, originalName: string) {
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/')) return Image;
  if (ext === 'pdf' || mimeType === 'application/pdf') return FileText;
  if (['xlsx','xls','csv'].includes(ext)) return FileSpreadsheet;
  return File;
}

function isPreviewable(mimeType: string, originalName: string) {
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  return mimeType.startsWith('image/') || mimeType === 'application/pdf' || ext === 'pdf';
}

// ── Preview Modal ────────────────────────────────────────────────────────────
// We fetch the file through axios (which sends the HttpOnly auth cookie) and
// turn the response into a blob URL. Using a raw <img src="...api/preview">
// or <iframe src="..."> bypasses axios and omits the cookie, causing 401s.
function PreviewModal({ file, onClose }: { file: any; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const isImage = file.mimeType?.startsWith('image/');
  const isPdf   = file.mimeType === 'application/pdf' || file.originalName?.endsWith('.pdf');

  // Fetch once on mount, revoke on unmount to avoid memory leaks
  useEffect(() => {
    let objectUrl: string;
    filesApi.preview(file.id)
      .then(res => {
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: file.mimeType }));
        setBlobUrl(objectUrl);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id, file.mimeType]);

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[70%]">{file.originalName}</p>
          <div className="flex items-center gap-2">
            {blobUrl && (
              <a href={blobUrl} className="btn-ghost text-xs gap-1.5 py-1.5 px-3" download={file.originalName}>
                <Download size={13} /> Download
              </a>
            )}
            <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={14} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0 flex items-center justify-center p-4">
          {loading ? (
            <Loader2 size={28} className="animate-spin text-[var(--text-muted)]" />
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--text-secondary)] mb-1">Failed to load preview</p>
              <p className="text-xs text-[var(--text-muted)]">The file may have been moved or deleted.</p>
            </div>
          ) : isImage && blobUrl ? (
            <img src={blobUrl} alt={file.originalName}
              className="max-w-full max-h-full object-contain rounded-lg" />
          ) : isPdf && blobUrl ? (
            <iframe src={blobUrl} className="w-full h-full min-h-[60vh] rounded-lg border-0" title={file.originalName} />
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet size={40} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
              <p className="text-sm text-[var(--text-secondary)] mb-1">{file.originalName}</p>
              <p className="text-xs text-[var(--text-muted)] mb-4">Preview not available for this file type</p>
              {blobUrl && (
                <a href={blobUrl} className="btn-primary text-xs gap-1.5" download={file.originalName}>
                  <Download size={13} /> Download to view
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface Props { patientId: string }

export default function PatientFilesPanel({ patientId }: Props) {
  const qc           = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading,   setUploading]   = useState(false);
  const [dragOver,    setDragOver]    = useState(false);
  const [category,    setCategory]    = useState<Category>('other');
  const [desc,        setDesc]        = useState('');
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [filesPage, setFilesPage] = useState(1);
  const [showGallery, setShowGallery] = useState(false);
  const [pickingLocal, setPickingLocal] = useState(false);
  const FILES_PAGE_SIZE = 5;
  const { activeBranch } = useAuthStore();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['patient-files', patientId],
    queryFn: () => filesApi.list(patientId).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => { toast.success('File deleted'); qc.invalidateQueries({ queryKey: ['patient-files', patientId] }); },
    onError: () => toast.error('Delete failed'),
  });

  const uploadFile = async (file: File) => {
    if (file.size > 40 * 1024 * 1024) { toast.error('Max file size is 40 MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      if (desc) fd.append('description', desc);
      await filesApi.upload(patientId, fd);
      toast.success(`${file.name} uploaded`);
      qc.invalidateQueries({ queryKey: ['patient-files', patientId] });
      setDesc('');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Upload failed');
    }
    finally { setUploading(false); }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDownload = async (file: any) => {
    try {
      const res = await filesApi.download(file.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: file.mimeType }));
      const a = document.createElement('a');
      a.href = url; a.download = file.originalName; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  // "Choose from Gallery" — pick from images the watched-folder feature has
  // already pulled in (see WatchedFolderSettingsTab / gallery-store.js).
  // Uploads through the exact same filesApi.upload call as a manual
  // drag-and-drop, then marks each gallery item as attached so it drops out
  // of the picker next time (and out of any "attach this?" prompt still
  // pending for it).
  const handleGalleryAttach = async (
    galleryFiles: { fileName: string; mimeType: string; data: string }[],
    galleryIds: string[],
  ) => {
    setUploading(true);
    try {
      for (const gf of galleryFiles) {
        const file = base64ToFile(gf.data, gf.fileName, gf.mimeType);
        await uploadFile(file);
      }
      if (isElectron) {
        await Promise.all(galleryIds.map((id) => window.electronAPI!.markGalleryItemAttached(id, patientId)));
      } else {
        await Promise.all(galleryIds.map((id) => galleryApi.attach(id, patientId)));
      }
    } finally {
      setUploading(false);
    }
  };

  // "Open Local Folder" — on desktop, a native multi-select file dialog
  // (remembers the last directory across the whole app, not just this
  // panel). On the web build there's no filesystem to open a native dialog
  // into, so this falls back to the same browser file picker the dropzone
  // already uses.
  const handleOpenLocalFolder = async () => {
    if (!isElectron) {
      fileInputRef.current?.click();
      return;
    }
    setPickingLocal(true);
    try {
      const picked = await window.electronAPI!.pickLocalImages();
      for (const f of picked) {
        const file = base64ToFile(f.data, f.fileName, f.mimeType);
        await uploadFile(file);
      }
    } catch {
      toast.error('Could not open the file picker');
    } finally {
      setPickingLocal(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <select value={category} onChange={e => setCategory(e.target.value as Category)} className="input py-1.5 text-xs flex-1">
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description…" className="input py-1.5 text-xs flex-1" />
        </div>

        {/* Gallery / local-folder shortcuts — the drop zone below still
            works exactly as before for a single quick upload; these are
            additional entry points, not replacements. */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setShowGallery(true)}
            disabled={uploading || pickingLocal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
          >
            <ImagePlus size={13} /> Choose from Gallery
          </button>
          <button
            type="button"
            onClick={handleOpenLocalFolder}
            disabled={uploading || pickingLocal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
          >
            {pickingLocal ? <Loader2 size={13} className="animate-spin" /> : <FolderOpen size={13} />}
            Open Local Folder
          </button>
        </div>

        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={clsx(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
            dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-[var(--border)] hover:border-[var(--border-hover)]',
            uploading && 'opacity-60 cursor-wait',
          )}>
          <input ref={fileInputRef} type="file" className="hidden"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileInput} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={20} className="animate-spin text-brand-400" />
              <p className="text-xs text-[var(--text-muted)]">Uploading…</p>
            </div>
          ) : (
            <>
              <Upload size={20} className="mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-xs font-medium text-[var(--text-secondary)]">Drop file or click to upload</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">JPG, PNG, PDF, Excel, CSV, X-ray (DICOM) • Max 40MB</p>
            </>
          )}
        </div>
      </div>

      {showGallery && (
        <GalleryPickerModal
          branchId={activeBranch?.id}
          onClose={() => setShowGallery(false)}
          onAttach={handleGalleryAttach}
        />
      )}

      {/* Files list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[var(--text-muted)]" /></div>
      ) : files.length === 0 ? (
        <div className="text-center py-8">
          <File size={24} className="mx-auto text-[var(--text-muted)] opacity-30 mb-2" />
          <p className="text-xs text-[var(--text-muted)]">No files uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(files as any[])
            .slice((filesPage - 1) * FILES_PAGE_SIZE, filesPage * FILES_PAGE_SIZE)
            .map((file: any) => {
              const Icon  = getFileIcon(file.mimeType, file.originalName);
              const color = CATEGORY_COLORS[file.category as Category] || CATEGORY_COLORS.other;
              const canPreview = isPreviewable(file.mimeType, file.originalName);
              return (
                <motion.div key={file.id}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl group"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">{file.originalName}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {formatSize(Number(file.size))} · {file.category}
                      {file.description && ` · ${file.description}`}
                    </p>
                  </div>
                  <ActionIconGroup className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {canPreview && (
                      <ActionIconButton
                        icon={<Eye />} size="sm" variant="primary"
                        tooltip="Preview" onClick={() => setPreviewFile(file)}
                      />
                    )}
                    <ActionIconButton
                      icon={<Download />} size="sm"
                      tooltip="Download" onClick={() => handleDownload(file)}
                    />
                    <ActionIconButton
                      icon={<Trash2 />} size="sm" variant="danger"
                      tooltip="Delete"
                      loading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(file.id)}
                    />
                  </ActionIconGroup>
                </motion.div>
              );
            })}
          {/* Files Pagination */}
          {(files as any[]).length > FILES_PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] text-[var(--text-muted)]">
                {(filesPage - 1) * FILES_PAGE_SIZE + 1}–{Math.min(filesPage * FILES_PAGE_SIZE, (files as any[]).length)} of {(files as any[]).length} files
              </p>
              <div className="flex gap-1.5">
                <button disabled={filesPage === 1} onClick={() => setFilesPage(p => p - 1)}
                  className="btn-secondary text-[10px] py-1 px-2.5 disabled:opacity-30">← Prev</button>
                <button disabled={filesPage * FILES_PAGE_SIZE >= (files as any[]).length} onClick={() => setFilesPage(p => p + 1)}
                  className="btn-secondary text-[10px] py-1 px-2.5 disabled:opacity-30">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      </AnimatePresence>
    </div>
  );
}