'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { patientsApi, filesApi } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import {
  Search, Upload, ZoomIn, ZoomOut,
  Pen, X, Calendar, Plus, Trash2, Grid, Columns,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface DermatologyImage {
  id:        string;
  url:       string;
  blobUrl?:  string; // resolved blob URL for display
  filename:  string;
  date:      string;
  label?:    string;
  notes?:    string;
  condition?: string;
  bodyRegion?: string;
}

interface Annotation {
  id: string; x: number; y: number; label: string; color: string;
}

function format_date(d: string) {
  try { return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

// ── Fetch image as blob URL so auth cookie is sent ─────────────────────────
function useImageBlobUrl(fileId: string | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) return;
    let objectUrl: string;
    filesApi.preview(fileId)
      .then(r => {
        objectUrl = URL.createObjectURL(r.data);
        setBlobUrl(objectUrl);
      })
      .catch(() => setBlobUrl(null));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [fileId]);

  return blobUrl;
}

// ── Single image with blob fetch ───────────────────────────────────────────
function AuthImage({ fileId, alt, className, style }: {
  fileId: string; alt: string; className?: string; style?: React.CSSProperties;
}) {
  const blobUrl = useImageBlobUrl(fileId);
  if (!blobUrl) {
    return <div className={className} style={{ ...style, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="text-gray-500 text-xs">Loading…</span>
    </div>;
  }
  return <img src={blobUrl} alt={alt} className={className} style={style} />;
}

// ── Comparison Slider ──────────────────────────────────────────────────────
function ComparisonSlider({ before, after }: { before: DermatologyImage; after: DermatologyImage }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderX, setSliderX]   = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom]         = useState(1);

  const beforeBlobUrl = useImageBlobUrl(before.id);
  const afterBlobUrl  = useImageBlobUrl(after.id);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderX(pct);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => { setIsDragging(true); updateSlider(e.clientX); };
  const onMouseMove = useCallback((e: MouseEvent) => { if (isDragging) updateSlider(e.clientX); }, [isDragging, updateSlider]);
  const onMouseUp   = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  const onTouchMove = (e: React.TouchEvent) => updateSlider(e.touches[0].clientX);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1 rounded hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"><ZoomOut size={14} /></button>
          <span className="text-xs text-[var(--text-secondary)] w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1 rounded hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"><ZoomIn size={14} /></button>
          <button onClick={() => setZoom(1)} className="px-2 py-0.5 text-xs rounded border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] ml-2">Reset</button>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">← Drag slider to compare →</p>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl cursor-col-resize select-none"
        style={{ height: 400, background: '#111' }}
        onMouseDown={onMouseDown}
        onTouchMove={onTouchMove}
        onTouchStart={e => { setIsDragging(true); updateSlider(e.touches[0].clientX); }}
        onTouchEnd={() => setIsDragging(false)}>

        {/* After image */}
        {afterBlobUrl ? (
          <img src={afterBlobUrl} alt="After"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <span className="text-gray-500 text-sm">Loading image…</span>
          </div>
        )}

        {/* Before image clipped */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: `${sliderX}%` }}>
          {beforeBlobUrl ? (
            <img src={beforeBlobUrl} alt="Before"
              className="absolute inset-0 h-full object-contain"
              style={{ width: `${100 / (sliderX / 100)}%`, transform: `scale(${zoom})`, transformOrigin: 'center' }} />
          ) : (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <span className="text-gray-500 text-sm">Loading…</span>
            </div>
          )}
        </div>

        {/* Slider handle */}
        <div className="absolute top-0 bottom-0 flex items-center justify-center"
          style={{ left: `${sliderX}%`, transform: 'translateX(-50%)', zIndex: 10 }}>
          <div className="w-0.5 h-full bg-white opacity-80" />
          <div className="absolute w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-col-resize">
            <span className="text-gray-600 text-xs font-bold">⟺</span>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 text-white text-xs rounded-lg pointer-events-none">
          BEFORE · {before.label ?? format_date(before.date)}
        </div>
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded-lg pointer-events-none">
          AFTER · {after.label ?? format_date(after.date)}
        </div>
      </div>
    </div>
  );
}

// ── Annotatable Image ──────────────────────────────────────────────────────
function AnnotatableImage({ image, annotations, onAddAnnotation, onRemoveAnnotation }: {
  image: DermatologyImage;
  annotations: Annotation[];
  onAddAnnotation: (a: Omit<Annotation, 'id'>) => void;
  onRemoveAnnotation: (id: string) => void;
}) {
  const blobUrl = useImageBlobUrl(image.id);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [pendingPos, setPendingPos]     = useState<{ x: number; y: number } | null>(null);
  const [label, setLabel]              = useState('');
  const [color, setColor]              = useState('#ef4444');

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = ((e.clientX - rect.left) / rect.width) * 100;
    const y    = ((e.clientY - rect.top)  / rect.height) * 100;
    setPendingPos({ x, y });
  };

  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff'];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setIsAnnotating(a => !a); setPendingPos(null); }}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${isAnnotating ? 'bg-purple-600 text-white border-purple-600' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'}`}>
          <Pen size={11} /> {isAnnotating ? 'Click image to annotate' : 'Add Annotation'}
        </button>
        {isAnnotating && (
          <div className="flex items-center gap-1">
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: color === c ? '#1d4ed8' : 'transparent' }}
              />
            ))}
          </div>
        )}
        {annotations.length > 0 && (
          <span className="ml-auto text-xs text-[var(--text-secondary)]">{annotations.length} annotation{annotations.length > 1 ? 's' : ''} saved</span>
        )}
      </div>

      <div
        className="relative rounded-xl overflow-hidden bg-black cursor-crosshair"
        style={{ height: 380 }}
        onClick={handleClick}>
        {blobUrl ? (
          <img src={blobUrl} alt={image.filename}
            className="w-full h-full object-contain pointer-events-none" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <span className="text-gray-400 text-sm">Loading image…</span>
          </div>
        )}

        {/* Annotations */}
        {annotations.map(ann => (
          <div key={ann.id}
            className="absolute group"
            style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: 'translate(-50%, -50%)' }}>
            <div className="w-4 h-4 rounded-full border-2 border-white shadow-lg" style={{ background: ann.color }} />
            <div className="absolute left-5 top-0 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap hidden group-hover:flex items-center gap-1.5 z-10">
              {ann.label}
              <button onClick={e => { e.stopPropagation(); onRemoveAnnotation(ann.id); }} className="hover:text-red-400"><X size={9} /></button>
            </div>
          </div>
        ))}

        {/* Pending annotation input */}
        {pendingPos && (
          <div
            className="absolute z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-xl p-2 w-44"
            style={{ left: `${Math.min(pendingPos.x, 60)}%`, top: `${pendingPos.y}%` }}
            onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              className="w-full px-2 py-1 text-xs border border-[var(--border)] rounded bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none mb-1.5"
              placeholder="Label…"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && label.trim()) {
                  onAddAnnotation({ x: pendingPos.x, y: pendingPos.y, label: label.trim(), color });
                  setLabel(''); setPendingPos(null);
                }
                if (e.key === 'Escape') { setPendingPos(null); setLabel(''); }
              }}
            />
            <div className="flex gap-1">
              <button onClick={() => setPendingPos(null)} className="flex-1 py-1 text-[10px] border border-[var(--border)] rounded hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]">Cancel</button>
              <button
                onClick={() => { if (label.trim()) { onAddAnnotation({ x: pendingPos.x, y: pendingPos.y, label: label.trim(), color }); setLabel(''); setPendingPos(null); } }}
                disabled={!label.trim()}
                className="flex-1 py-1 text-[10px] bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-40">
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Progression Strip ──────────────────────────────────────────────────────
function ProgressionStrip({ images, selectedIdx, onSelect }: { images: DermatologyImage[]; selectedIdx: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {images.map((img, i) => {
        // Each thumbnail fetches its own blob
        return (
          <ThumbButton key={img.id} img={img} i={i} selectedIdx={selectedIdx} onSelect={onSelect} />
        );
      })}
    </div>
  );
}

function ThumbButton({ img, i, selectedIdx, onSelect }: { img: DermatologyImage; i: number; selectedIdx: number; onSelect: (i: number) => void }) {
  const blobUrl = useImageBlobUrl(img.id);
  return (
    <button onClick={() => onSelect(i)}
      className={`shrink-0 flex flex-col items-center gap-1 p-1 rounded-lg border-2 transition-all ${i === selectedIdx ? 'border-[var(--brand)]' : 'border-transparent hover:border-[var(--border)]'}`}>
      <div className="w-16 h-16 rounded overflow-hidden bg-gray-900 flex items-center justify-center">
        {blobUrl
          ? <img src={blobUrl} alt={img.filename} className="w-full h-full object-cover" />
          : <span className="text-gray-600 text-[9px]">…</span>
        }
      </div>
      <p className="text-[9px] text-[var(--text-secondary)] max-w-[64px] truncate text-center">{img.label ?? format_date(img.date)}</p>
    </button>
  );
}

// ── Persist annotations to localStorage ───────────────────────────────────
const ANNOT_KEY = (patientId: string) => `derm_annotations_${patientId}`;

function loadAnnotations(patientId: string): Record<string, Annotation[]> {
  try { return JSON.parse(localStorage.getItem(ANNOT_KEY(patientId)) ?? '{}'); }
  catch { return {}; }
}
function saveAnnotationsStore(patientId: string, data: Record<string, Annotation[]>) {
  try { localStorage.setItem(ANNOT_KEY(patientId), JSON.stringify(data)); }
  catch {}
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DermatologyPage() {
  const qc = useQueryClient();
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [search, setSearch]     = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'compare' | 'annotate' | 'grid'>('compare');
  const [beforeIdx, setBeforeIdx] = useState(0);
  const [afterIdx, setAfterIdx]   = useState(1);
  const [annotations, setAnnotations] = useState<Record<string, Annotation[]>>({});

  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', search],
    queryFn:  () => patientsApi.list({ search, limit: 10 }).then(r => r.data),
    enabled:  search.length >= 2,
  });
  const patients = patientsData?.data ?? [];

  const { data: filesData } = useQuery({
    queryKey: ['derm-images', selectedPatient?.id],
    queryFn: () => filesApi.list(selectedPatient.id).then(r => r.data?.data ?? r.data ?? []),
    enabled:  !!selectedPatient?.id,
  });

  const images: DermatologyImage[] = (filesData ?? []).map((f: any, i: number) => ({
    id: f.id, url: f.url ?? f.signedUrl ?? '', filename: f.filename ?? f.name ?? `image-${i}`,
    date: f.createdAt,
    notes: f.notes,
    label: f.metadata?.label ?? `Visit ${i + 1}`,
    condition: f.metadata?.condition,
    bodyRegion: f.metadata?.bodyRegion,
  }));

  // Load annotations from localStorage when patient changes
  useEffect(() => {
    if (selectedPatient?.id) {
      setAnnotations(loadAnnotations(selectedPatient.id));
    }
  }, [selectedPatient?.id]);

  const displayImages = images;
  const safeBeforeIdx = Math.min(beforeIdx, Math.max(0, displayImages.length - 1));
  const safeAfterIdx  = Math.min(afterIdx, Math.max(0, displayImages.length - 1));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedPatient) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'dermatology');
    try {
      await filesApi.upload(selectedPatient.id, fd);
      toast.success('Image uploaded');
      qc.invalidateQueries({ queryKey: ['derm-images', selectedPatient?.id] });
    } catch { toast.error('Upload failed'); }
    e.target.value = '';
  };

  const addAnnotation = (imageId: string, ann: Omit<Annotation, 'id'>) => {
    setAnnotations(prev => {
      const updated = {
        ...prev,
        [imageId]: [...(prev[imageId] ?? []), { ...ann, id: Date.now().toString() }],
      };
      if (selectedPatient?.id) saveAnnotationsStore(selectedPatient.id, updated);
      return updated;
    });
    toast.success('Annotation saved');
  };

  const removeAnnotation = (imageId: string, annId: string) => {
    setAnnotations(prev => {
      const updated = { ...prev, [imageId]: (prev[imageId] ?? []).filter(a => a.id !== annId) };
      if (selectedPatient?.id) saveAnnotationsStore(selectedPatient.id, updated);
      return updated;
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header title="Dermatology Viewer" subtitle="Before/after comparison · Skin progression · Annotations" />

      {/* Sub-header */}
      <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center gap-4">
        <div className="flex-1 max-w-sm relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="w-full pl-9 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            placeholder="Search patient…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {patients.length > 0 && search.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 border border-[var(--border)] rounded-lg shadow-lg bg-[var(--bg-surface)] z-10">
              {patients.map((p: any) => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setSearch(''); setBeforeIdx(0); setAfterIdx(1); setAnnotations({}); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-muted)] text-[var(--text-primary)]">
                  {p.firstName} {p.lastName} · {p.phone}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
            {([
              { key: 'compare',  icon: Columns, label: 'Compare' },
              { key: 'annotate', icon: Pen,     label: 'Annotate' },
              { key: 'grid',     icon: Grid,    label: 'Grid' },
            ] as { key: typeof viewMode; icon: any; label: string }[]).map(m => (
              <button key={m.key} onClick={() => setViewMode(m.key)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${viewMode === m.key ? 'bg-[var(--brand)] text-white' : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]'}`}>
                <m.icon size={12} /> {m.label}
              </button>
            ))}
          </div>

          {selectedPatient && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--brand)] text-white rounded-lg hover:opacity-90">
                <Upload size={12} /> Upload Image
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selectedPatient ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
            <Columns size={36} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Dermatology Image Viewer</p>
            <p className="text-xs mt-1 opacity-60">Search for a patient to view their images</p>
          </div>
        ) : displayImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
            <Upload size={36} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">No images uploaded</p>
            <p className="text-xs mt-1 opacity-60">Upload images using the button above</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Compare mode */}
            {viewMode === 'compare' && (
              <>
                {displayImages.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-[var(--text-secondary)]">
                    <p className="text-sm">Upload at least 2 images to compare</p>
                  </div>
                ) : (
                  <>
                    <ComparisonSlider before={displayImages[safeBeforeIdx]} after={displayImages[safeAfterIdx]} />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">BEFORE image</p>
                        <ProgressionStrip images={displayImages} selectedIdx={safeBeforeIdx} onSelect={i => setBeforeIdx(i)} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">AFTER image</p>
                        <ProgressionStrip images={displayImages} selectedIdx={safeAfterIdx} onSelect={i => setAfterIdx(i)} />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Annotate mode */}
            {viewMode === 'annotate' && (
              <>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Select an image then click to add markers. Annotations are saved automatically.</p>
                <ProgressionStrip images={displayImages} selectedIdx={afterIdx} onSelect={i => setAfterIdx(i)} />
                {displayImages[safeAfterIdx] && (
                  <AnnotatableImage
                    image={displayImages[safeAfterIdx]}
                    annotations={annotations[displayImages[safeAfterIdx]?.id] ?? []}
                    onAddAnnotation={ann => addAnnotation(displayImages[safeAfterIdx].id, ann)}
                    onRemoveAnnotation={id => removeAnnotation(displayImages[safeAfterIdx].id, id)}
                  />
                )}
              </>
            )}

            {/* Grid mode */}
            {viewMode === 'grid' && (
              <>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Progression Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {displayImages.map((img, i) => (
                    <GridImageCard
                      key={img.id}
                      img={img}
                      i={i}
                      annotationCount={annotations[img.id]?.length ?? 0}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GridImageCard({ img, i, annotationCount }: { img: DermatologyImage; i: number; annotationCount: number }) {
  const blobUrl = useImageBlobUrl(img.id);
  return (
    <div className="space-y-1">
      <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-square flex items-center justify-center">
        {blobUrl
          ? <img src={blobUrl} alt={img.filename} className="w-full h-full object-contain" />
          : <span className="text-gray-600 text-xs">Loading…</span>
        }
        {annotationCount > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-purple-600 text-white text-[9px] rounded-full">
            {annotationCount} annotations
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-[var(--text-primary)] text-center">{img.label ?? `Visit ${i + 1}`}</p>
      <p className="text-[10px] text-[var(--text-secondary)] text-center">{format_date(img.date)}</p>
      {img.notes && <p className="text-[10px] text-[var(--text-secondary)] text-center italic">{img.notes}</p>}
    </div>
  );
}
