'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { filesApi, patientsApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import toast from 'react-hot-toast';
import {
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Contrast, Sun, Maximize2,
  Minimize2, Ruler, Pen, Download, Upload, FlipHorizontal, FlipVertical,
  Grid3x3, X, Search, ChevronLeft, ChevronRight, Layers, Eye, EyeOff,
  RefreshCw, Crosshair, Square, Circle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface ScanImage {
  id: string;
  url: string;
  filename: string;
  type: string;
  patientId: string;
  patientName?: string;
  createdAt: string;
  notes?: string;
  modality?: string; // XRAY, CT, MRI, etc.
}

interface Annotation {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'freehand' | 'text';
  color: string;
  label?: string;
  x: number; y: number; w?: number; h?: number;
  points?: number[];
}

interface ViewerTransform {
  zoom: number;
  panX: number;
  panY: number;
  rotate: number;
  brightness: number;
  contrast: number;
  flipH: boolean;
  flipV: boolean;
  invert: boolean;
}

const DEFAULT_TRANSFORM: ViewerTransform = {
  zoom: 1, panX: 0, panY: 0, rotate: 0,
  brightness: 100, contrast: 100, flipH: false, flipV: false, invert: false,
};

// ── Image Viewer Canvas ────────────────────────────────────────────────────
function ImageViewerCanvas({
  imageUrl, transform, annotations, activeTool, onAddAnnotation, isCompare = false,
}: {
  imageUrl: string;
  transform: ViewerTransform;
  annotations: Annotation[];
  activeTool: string;
  onAddAnnotation?: (ann: Annotation) => void;
  isCompare?: boolean;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);
  const dragging   = useRef(false);
  const dragStart  = useRef({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: transform.panX, y: transform.panY });
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [tempAnnotation, setTempAnnotation] = useState<Annotation | null>(null);

  useEffect(() => {
    let objectUrl: string;

    const loadImage = (src: string) => {
      const img = new Image();
      img.onload = () => { imgRef.current = img; render(); };
      img.src = src;
    };

    // Extract file ID from URLs like /files/{id}/preview or /files/{id}/download
    const fileIdMatch = imageUrl?.match(/\/files\/([^/?#]+)\/(?:preview|download)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;

    if (fileId) {
      filesApi.preview(fileId)
        .then(r => {
          objectUrl = URL.createObjectURL(r.data);
          loadImage(objectUrl);
        })
        .catch(() => loadImage(imageUrl));
    } else if (imageUrl?.startsWith('http')) {
      // For direct public URLs just load directly
      loadImage(imageUrl);
    } else if (imageUrl) {
      // Treat imageUrl itself as a file ID
      filesApi.preview(imageUrl)
        .then(r => {
          objectUrl = URL.createObjectURL(r.data);
          loadImage(objectUrl);
        })
        .catch(() => loadImage(imageUrl));
    }

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imageUrl]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.rotate((transform.rotate * Math.PI) / 180);
    ctx.scale(
      transform.zoom * (transform.flipH ? -1 : 1),
      transform.zoom * (transform.flipV ? -1 : 1),
    );

    const filter = [
      `brightness(${transform.brightness}%)`,
      `contrast(${transform.contrast}%)`,
      transform.invert ? 'invert(1)' : '',
    ].filter(Boolean).join(' ');
    ctx.filter = filter;

    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);
    ctx.restore();

    // Draw annotations
    annotations.forEach(ann => drawAnnotation(ctx, ann, width, height));
    if (tempAnnotation) drawAnnotation(ctx, tempAnnotation, width, height);
  }, [transform, pan, annotations, tempAnnotation]);

  useEffect(() => { render(); }, [render]);

  function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation, w: number, h: number) {
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    if (ann.type === 'rect') {
      ctx.strokeRect(ann.x, ann.y, ann.w ?? 0, ann.h ?? 0);
      if (ann.label) {
        ctx.fillStyle = ann.color;
        ctx.font = '11px system-ui';
        ctx.fillText(ann.label, ann.x + 2, ann.y - 4);
      }
    } else if (ann.type === 'circle') {
      ctx.beginPath();
      const rx = (ann.w ?? 0) / 2;
      const ry = (ann.h ?? 0) / 2;
      ctx.ellipse(ann.x + rx, ann.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (ann.type === 'line' && ann.points) {
      ctx.beginPath();
      ctx.moveTo(ann.points[0], ann.points[1]);
      ctx.lineTo(ann.points[2], ann.points[3]);
      ctx.stroke();
      // Measurement label
      const dx = ann.points[2] - ann.points[0];
      const dy = ann.points[3] - ann.points[1];
      const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);
      ctx.fillStyle = ann.color;
      ctx.font = '11px system-ui';
      ctx.fillText(`${dist}px`, (ann.points[0] + ann.points[2]) / 2 + 4, (ann.points[1] + ann.points[3]) / 2 - 4);
    }
  }

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (activeTool === 'pan') {
      dragging.current = true;
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    } else if (['rect', 'circle', 'line'].includes(activeTool)) {
      setDrawing(true);
      setDrawStart(pos);
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (dragging.current && activeTool === 'pan') {
      setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    } else if (drawing) {
      const w = pos.x - drawStart.x;
      const h = pos.y - drawStart.y;
      const temp: Annotation = {
        id: 'temp', type: activeTool as any, color: '#ef4444',
        x: drawStart.x, y: drawStart.y, w, h,
        points: activeTool === 'line' ? [drawStart.x, drawStart.y, pos.x, pos.y] : undefined,
      };
      setTempAnnotation(temp);
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    dragging.current = false;
    if (drawing && onAddAnnotation) {
      const w = pos.x - drawStart.x;
      const h = pos.y - drawStart.y;
      if (Math.abs(w) > 5 || Math.abs(h) > 5) {
        const ann: Annotation = {
          id: Date.now().toString(),
          type: activeTool as any,
          color: '#ef4444',
          x: drawStart.x, y: drawStart.y, w, h,
          points: activeTool === 'line' ? [drawStart.x, drawStart.y, pos.x, pos.y] : undefined,
        };
        onAddAnnotation(ann);
      }
      setTempAnnotation(null);
      setDrawing(false);
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  return (
    <canvas
      ref={canvasRef}
      width={isCompare ? 600 : 900}
      height={600}
      className="w-full h-full object-contain cursor-crosshair"
      style={{ cursor: activeTool === 'pan' ? 'grab' : 'crosshair' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    />
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────
function ViewerToolbar({ transform, setTransform, activeTool, setActiveTool, onDownload }: {
  transform: ViewerTransform;
  setTransform: (t: ViewerTransform | ((prev: ViewerTransform) => ViewerTransform)) => void;
  activeTool: string;
  setActiveTool: (t: string) => void;
  onDownload?: () => void;
}) {
  const btn = (active: boolean) =>
    `p-1.5 rounded-lg transition-colors text-xs ${active ? 'bg-blue-600 text-white' : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]'}`;

  return (
    <div className="flex items-center gap-1 flex-wrap px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-surface)]">
      {/* Tools */}
      <div className="flex items-center gap-0.5 mr-2 border-r border-[var(--border)] pr-2">
        {[
          { key: 'pan',    icon: <Maximize2 size={14} />,  title: 'Pan' },
          { key: 'rect',   icon: <Square size={14} />,     title: 'Rectangle' },
          { key: 'circle', icon: <Circle size={14} />,     title: 'Ellipse' },
          { key: 'line',   icon: <Ruler size={14} />,      title: 'Measure' },
        ].map(t => (
          <button key={t.key} title={t.title} onClick={() => setActiveTool(t.key)} className={btn(activeTool === t.key)}>
            {t.icon}
          </button>
        ))}
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-0.5 mr-2 border-r border-[var(--border)] pr-2">
        <button onClick={() => setTransform(t => ({ ...t, zoom: Math.max(0.1, t.zoom - 0.1) }))} className={btn(false)} title="Zoom Out"><ZoomOut size={14} /></button>
        <span className="text-xs w-10 text-center text-[var(--text-secondary)]">{Math.round(transform.zoom * 100)}%</span>
        <button onClick={() => setTransform(t => ({ ...t, zoom: Math.min(8, t.zoom + 0.1) }))} className={btn(false)} title="Zoom In"><ZoomIn size={14} /></button>
      </div>

      {/* Rotate */}
      <div className="flex items-center gap-0.5 mr-2 border-r border-[var(--border)] pr-2">
        <button onClick={() => setTransform(t => ({ ...t, rotate: t.rotate - 90 }))} className={btn(false)} title="Rotate CCW"><RotateCcw size={14} /></button>
        <button onClick={() => setTransform(t => ({ ...t, rotate: t.rotate + 90 }))} className={btn(false)} title="Rotate CW"><RotateCw size={14} /></button>
      </div>

      {/* Flip */}
      <div className="flex items-center gap-0.5 mr-2 border-r border-[var(--border)] pr-2">
        <button onClick={() => setTransform(t => ({ ...t, flipH: !t.flipH }))} className={btn(transform.flipH)} title="Flip H"><FlipHorizontal size={14} /></button>
        <button onClick={() => setTransform(t => ({ ...t, flipV: !t.flipV }))} className={btn(transform.flipV)} title="Flip V"><FlipVertical size={14} /></button>
      </div>

      {/* Brightness/Contrast */}
      <div className="flex items-center gap-1 mr-2 border-r border-[var(--border)] pr-2">
        <Sun size={12} className="text-[var(--text-secondary)]" />
        <input type="range" min={0} max={200} value={transform.brightness}
          onChange={e => setTransform(t => ({ ...t, brightness: +e.target.value }))}
          className="w-16 h-1 accent-blue-600" title="Brightness" />
        <Contrast size={12} className="text-[var(--text-secondary)]" />
        <input type="range" min={0} max={300} value={transform.contrast}
          onChange={e => setTransform(t => ({ ...t, contrast: +e.target.value }))}
          className="w-16 h-1 accent-blue-600" title="Contrast" />
      </div>

      {/* Invert */}
      <button onClick={() => setTransform(t => ({ ...t, invert: !t.invert }))} className={btn(transform.invert)} title="Invert">
        <Eye size={14} />
      </button>

      {/* Reset */}
      <button onClick={() => setTransform(DEFAULT_TRANSFORM)} className={btn(false)} title="Reset">
        <RefreshCw size={14} />
      </button>

      {onDownload && (
        <button onClick={onDownload} className={btn(false)} title="Download">
          <Download size={14} />
        </button>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ImagingPage() {
  const { clinic, activeBranch } = useAuthStore();
  const qc = useQueryClient();
  const [selectedScan, setSelectedScan]       = useState<ScanImage | null>(null);
  const [compareScan, setCompareScan]         = useState<ScanImage | null>(null);
  const [compareMode, setCompareMode]         = useState(false);
  const [transform, setTransform]             = useState<ViewerTransform>(DEFAULT_TRANSFORM);
  const [compareTransform, setCompareTransform] = useState<ViewerTransform>(DEFAULT_TRANSFORM);
  const [activeTool, setActiveTool]           = useState('pan');
  const [annotations, setAnnotations]         = useState<Annotation[]>([]);
  const [patientSearch, setPatientSearch]     = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showUpload, setShowUpload]           = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Patient search
  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', patientSearch],
    queryFn: () => patientsApi.list({ search: patientSearch, limit: 10 }).then(r => r.data),
    enabled: patientSearch.length >= 2,
  });
  const patients = patientsData?.data ?? [];

  // Patient files (imaging)
  const { data: scansData, isLoading: scansLoading } = useQuery({
    queryKey: ['patient-scans', selectedPatient?.id],
    queryFn: () => filesApi.list(selectedPatient.id).then(r => {
      const all: any[] = r.data?.data ?? r.data ?? [];
      return all.filter((f: any) =>
        f.mimeType?.startsWith('image/') ||
        f.type === 'imaging' ||
        f.metadata?.type === 'imaging'
      );
    }),
    enabled: !!selectedPatient?.id,
  });
  const scans: ScanImage[] = (scansData ?? []).map((f: any) => ({
    id: f.id,
    // Pass the file ID so ImageViewerCanvas can use filesApi.preview
    url: f.id,
    filename: f.filename ?? f.name ?? 'scan',
    type: f.mimeType ?? f.type,
    patientId: f.patientId ?? selectedPatient?.id,
    patientName: `${selectedPatient?.firstName} ${selectedPatient?.lastName}`,
    createdAt: f.createdAt,
    notes: f.notes,
    modality: f.metadata?.modality ?? (f.filename?.toUpperCase().includes('XRAY') ? 'XRAY' : 'SCAN'),
  }));

  const handleAddAnnotation = (ann: Annotation) => setAnnotations(prev => [...prev, ann]);
  const clearAnnotations = () => setAnnotations([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedPatient) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append('file', file);
    try {
      await filesApi.upload(selectedPatient.id, fd);
      toast.success('Scan uploaded');
      qc.invalidateQueries({ queryKey: ['patient-scans', selectedPatient?.id] });
    } catch {
      toast.error('Upload failed');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-base)]">
      <Header title="Medical Imaging" subtitle="DICOM viewer · Annotations · Measurements" />
      <div className="flex flex-1 overflow-hidden">
      {/* ── Sidebar ── */}
      <div className="w-64 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-surface)]">
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="text-base font-semibold text-[var(--text-primary)] mb-3">Medical Imaging</h1>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              placeholder="Search patient…"
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
            />
          </div>
          {patients.length > 0 && patientSearch.length >= 2 && (
            <div className="mt-1 border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-surface)] shadow-sm">
              {patients.map((p: any) => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(''); setSelectedScan(null); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-muted)] text-[var(--text-primary)]">
                  {p.firstName} {p.lastName} · {p.phone}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedPatient && (
          <div className="p-3 border-b border-[var(--border)] bg-blue-50/50 dark:bg-blue-950/20">
            <p className="text-xs font-medium text-[var(--text-primary)]">{selectedPatient.firstName} {selectedPatient.lastName}</p>
            <p className="text-[10px] text-[var(--text-secondary)]">{selectedPatient.phone}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {!selectedPatient && (
            <div className="flex flex-col items-center justify-center h-32 text-[var(--text-secondary)]">
              <Search size={24} className="mb-2 opacity-30" />
              <p className="text-xs text-center">Search for a patient to view their scans</p>
            </div>
          )}
          {selectedPatient && scansLoading && (
            <div className="text-center py-8 text-xs text-[var(--text-secondary)]">Loading scans…</div>
          )}
          {selectedPatient && !scansLoading && scans.length === 0 && (
            <div className="text-center py-8 text-xs text-[var(--text-secondary)]">No imaging files found</div>
          )}
          {scans.map(scan => (
            <button key={scan.id}
              onClick={() => { setSelectedScan(scan); setTransform(DEFAULT_TRANSFORM); setAnnotations([]); }}
              className={`w-full text-left p-2 rounded-lg mb-1 border transition-colors ${
                selectedScan?.id === scan.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-[var(--border)] hover:bg-[var(--bg-muted)]'
              }`}>
              <div className="flex items-start gap-2">
                <div className="w-10 h-10 rounded bg-gray-900 flex items-center justify-center shrink-0 overflow-hidden text-gray-500 text-[9px]">
                  IMG
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{scan.filename}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{scan.modality ?? 'SCAN'} · {new Date(scan.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedPatient && (
          <div className="p-3 border-t border-[var(--border)]">
            <input ref={fileInputRef} type="file" accept="image/*,.dcm" className="hidden" onChange={handleUpload} />
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs bg-[var(--brand)] text-white rounded-lg hover:opacity-90">
              <Upload size={12} /> Upload Scan
            </button>
          </div>
        )}
      </div>

      {/* ── Main Viewer ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedScan ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
            <Layers size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Medical Imaging Viewer</p>
            <p className="text-sm mt-1 opacity-60">Select a patient and scan from the sidebar</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {['Zoom & Pan', 'Brightness/Contrast', 'Annotations & Measurements'].map(f => (
                <div key={f} className="px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                  <p className="text-xs font-medium text-[var(--text-primary)]">{f}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Viewer Toolbar */}
            <ViewerToolbar
              transform={transform}
              setTransform={setTransform}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              onDownload={async () => {
                try {
                  const r = await filesApi.download(selectedScan.id);
                  const url = URL.createObjectURL(r.data);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = selectedScan.filename;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {}
              }}
            />

            {/* Secondary toolbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--bg-base)] text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{selectedScan.filename}</span>
              <span>·</span>
              <span>{selectedScan.modality}</span>
              <span>·</span>
              <span>{new Date(selectedScan.createdAt).toLocaleDateString()}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => { setCompareMode(m => !m); if (compareMode) setCompareScan(null); }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${compareMode ? 'bg-blue-600 text-white border-blue-600' : 'border-[var(--border)] hover:bg-[var(--bg-muted)]'}`}>
                  <Grid3x3 size={12} /> Compare
                </button>
                {annotations.length > 0 && (
                  <button onClick={clearAnnotations} className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-[var(--border)] hover:bg-[var(--bg-muted)]">
                    <X size={12} /> Clear annotations ({annotations.length})
                  </button>
                )}
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-hidden flex" style={{ background: '#0a0a0f' }}>
              {/* Primary */}
              <div className="flex-1 relative overflow-hidden">
                <ImageViewerCanvas
                  imageUrl={selectedScan.url}
                  transform={transform}
                  annotations={annotations}
                  activeTool={activeTool}
                  onAddAnnotation={handleAddAnnotation}
                />
                <div className="absolute top-2 left-2 text-[10px] text-gray-400 bg-black/40 px-2 py-0.5 rounded">
                  {selectedScan.patientName} · {selectedScan.modality}
                </div>
              </div>

              {/* Compare pane */}
              {compareMode && (
                <div className="flex-1 border-l border-gray-700 relative overflow-hidden">
                  {!compareScan ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <p className="text-sm mb-3">Select a scan to compare</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto px-4 w-full">
                        {scans.filter(s => s.id !== selectedScan.id).map(s => (
                          <button key={s.id} onClick={() => { setCompareScan(s); setCompareTransform(DEFAULT_TRANSFORM); }}
                            className="w-full text-left px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-200">
                            {s.filename} · {new Date(s.createdAt).toLocaleDateString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <ViewerToolbar transform={compareTransform} setTransform={setCompareTransform} activeTool={activeTool} setActiveTool={setActiveTool} />
                      <ImageViewerCanvas
                        imageUrl={compareScan.url}
                        transform={compareTransform}
                        annotations={[]}
                        activeTool={activeTool}
                        isCompare
                      />
                      <div className="absolute top-2 left-2 text-[10px] text-gray-400 bg-black/40 px-2 py-0.5 rounded">
                        {new Date(compareScan.createdAt).toLocaleDateString()} · Compare
                      </div>
                      <button onClick={() => setCompareScan(null)} className="absolute top-2 right-2 p-1 bg-black/50 rounded text-gray-400 hover:text-white">
                        <X size={12} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}