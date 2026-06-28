'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, X, Save, Trash2, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';

// ── Types ──────────────────────────────────────────────────────────────────
type PainLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type BodySide  = 'front' | 'back';

interface BodyAnnotation {
  id:       string;
  x:        number;
  y:        number;
  region:   string;
  pain:     PainLevel;
  symptom:  string;
  notes?:   string;
  date:     string;
  doctor?:  string;
}

const PAIN_COLORS: Record<number, string> = {
  0: '#22c55e', 1: '#4ade80', 2: '#86efac', 3: '#fbbf24',
  4: '#f59e0b', 5: '#f97316', 6: '#ef4444', 7: '#dc2626',
  8: '#b91c1c', 9: '#991b1b', 10: '#7f1d1d',
};

const BODY_REGIONS: Record<string, { front?: { x: number; y: number }; back?: { x: number; y: number } }> = {
  'Head':            { front: { x: 50, y: 8 },   back: { x: 50, y: 8 } },
  'Neck':            { front: { x: 50, y: 16 },  back: { x: 50, y: 16 } },
  'Left Shoulder':   { front: { x: 32, y: 21 },  back: { x: 32, y: 21 } },
  'Right Shoulder':  { front: { x: 68, y: 21 },  back: { x: 68, y: 21 } },
  'Chest':           { front: { x: 50, y: 27 } },
  'Upper Back':      { back:  { x: 50, y: 27 } },
  'Left Arm':        { front: { x: 26, y: 35 },  back: { x: 26, y: 35 } },
  'Right Arm':       { front: { x: 74, y: 35 },  back: { x: 74, y: 35 } },
  'Abdomen':         { front: { x: 50, y: 40 } },
  'Lower Back':      { back:  { x: 50, y: 40 } },
  'Left Hip':        { front: { x: 38, y: 50 },  back: { x: 38, y: 50 } },
  'Right Hip':       { front: { x: 62, y: 50 },  back: { x: 62, y: 50 } },
  'Groin':           { front: { x: 50, y: 53 } },
  'Buttocks':        { back:  { x: 50, y: 53 } },
  'Left Thigh':      { front: { x: 37, y: 62 },  back: { x: 37, y: 62 } },
  'Right Thigh':     { front: { x: 63, y: 62 },  back: { x: 63, y: 62 } },
  'Left Knee':       { front: { x: 37, y: 72 },  back: { x: 37, y: 72 } },
  'Right Knee':      { front: { x: 63, y: 72 },  back: { x: 63, y: 72 } },
  'Left Shin/Calf':  { front: { x: 36, y: 82 },  back: { x: 36, y: 82 } },
  'Right Shin/Calf': { front: { x: 64, y: 82 },  back: { x: 64, y: 82 } },
  'Left Foot':       { front: { x: 37, y: 93 },  back: { x: 37, y: 93 } },
  'Right Foot':      { front: { x: 63, y: 93 },  back: { x: 63, y: 93 } },
};

// Simple SVG human body outline
function BodySilhouette({ side }: { side: BodySide }) {
  if (side === 'front') return (
    <svg viewBox="0 0 100 200" className="w-full h-full">
      <ellipse cx="50" cy="16" rx="12" ry="14" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="0.8" />
      <rect x="45" y="28" width="10" height="8" rx="2" fill="currentColor" opacity="0.12" />
      <path d="M32 36 L68 36 L72 80 L28 80 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M32 37 L20 38 L16 75 L24 75 L26 40 L33 42 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M68 37 L80 38 L84 75 L76 75 L74 40 L67 42 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M30 78 L70 78 L68 90 L32 90 Z" fill="currentColor" opacity="0.12" />
      <path d="M32 88 L44 88 L46 140 L34 140 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M56 88 L68 88 L66 140 L54 140 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M34 138 L45 138 L46 185 L35 185 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M55 138 L66 138 L65 185 L54 185 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <ellipse cx="38" cy="190" rx="8" ry="4" fill="currentColor" opacity="0.15" />
      <ellipse cx="62" cy="190" rx="8" ry="4" fill="currentColor" opacity="0.15" />
      <circle cx="46" cy="15" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="54" cy="15" r="1.5" fill="currentColor" opacity="0.4" />
      <path d="M45 20 Q50 23 55 20" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4" />
    </svg>
  );
  return (
    <svg viewBox="0 0 100 200" className="w-full h-full">
      <ellipse cx="50" cy="16" rx="12" ry="14" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="0.8" />
      <rect x="45" y="28" width="10" height="8" rx="2" fill="currentColor" opacity="0.12" />
      <path d="M30 36 L70 36 L74 80 L26 80 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <line x1="50" y1="36" x2="50" y2="80" stroke="currentColor" strokeWidth="0.5" opacity="0.4" strokeDasharray="2,2" />
      <path d="M30 37 L18 38 L14 75 L22 75 L24 40 L31 42 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M70 37 L82 38 L86 75 L78 75 L76 40 L69 42 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M28 78 L72 78 L70 92 L30 92 Z" fill="currentColor" opacity="0.15" />
      <path d="M30 90 L44 90 L46 140 L32 140 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M56 90 L70 90 L68 140 L54 140 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M32 138 L45 138 L46 185 L33 185 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <path d="M55 138 L68 138 L67 185 L54 185 Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
      <ellipse cx="38" cy="190" rx="8" ry="4" fill="currentColor" opacity="0.15" />
      <ellipse cx="62" cy="190" rx="8" ry="4" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

// ── Annotation Popup ───────────────────────────────────────────────────────
function AnnotationPopup({ x, y, onSave, onCancel }: {
  x: number; y: number;
  onSave: (data: { region: string; pain: PainLevel; symptom: string; notes?: string }) => void;
  onCancel: () => void;
}) {
  const [pain, setPain] = useState<PainLevel>(5);
  const [symptom, setSymptom] = useState('');
  const [notes, setNotes] = useState('');
  const [region, setRegion] = useState('');

  const inp = 'w-full px-2 py-1.5 text-xs border border-[var(--border)] rounded bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]';

  return (
    <div className="absolute z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-xl p-3 w-56"
      style={{ left: `${Math.min(x, 70)}%`, top: `${Math.min(y + 3, 85)}%`, transform: 'translateX(-50%)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[var(--text-primary)]">Add Symptom</p>
        <button onClick={onCancel} className="p-0.5 hover:bg-[var(--bg-muted)] rounded"><X size={12} /></button>
      </div>
      <div className="space-y-2">
        <input className={inp} placeholder="Region (e.g. Left Knee)" value={region} onChange={e => setRegion(e.target.value)} />
        <input className={inp} placeholder="Symptom (e.g. Sharp pain)" value={symptom} onChange={e => setSymptom(e.target.value)} />
        <div>
          <p className="text-[10px] text-[var(--text-secondary)] mb-1">Pain Level: <span style={{ color: PAIN_COLORS[pain] }} className="font-bold">{pain}/10</span></p>
          <input type="range" min={0} max={10} value={pain} onChange={e => setPain(+e.target.value as PainLevel)}
            className="w-full h-1.5 rounded-full cursor-pointer"
            style={{ accentColor: PAIN_COLORS[pain] }} />
        </div>
        <textarea className={inp} rows={2} placeholder="Notes…" value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="flex gap-1">
          <button onClick={onCancel} className="flex-1 py-1.5 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]">Cancel</button>
          <button
            onClick={() => { if (symptom && region) onSave({ region, pain, symptom, notes }); }}
            disabled={!symptom || !region}
            className="flex-1 py-1.5 text-xs bg-[var(--brand)] text-white rounded hover:opacity-90 disabled:opacity-50">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Persist annotations to patient notes via API ───────────────────────────
const STORAGE_KEY = (patientId: string) => `body_annotations_${patientId}`;

function loadAnnotations(patientId: string): BodyAnnotation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(patientId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAnnotations(patientId: string, annotations: BodyAnnotation[]) {
  try {
    localStorage.setItem(STORAGE_KEY(patientId), JSON.stringify(annotations));
  } catch {}
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AnatomyPage() {
  const qc = useQueryClient();
  const [search, setSearch]           = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [side, setSide]               = useState<BodySide>('front');
  const [annotations, setAnnotations] = useState<BodyAnnotation[]>([]);
  const [pendingClick, setPendingClick] = useState<{ x: number; y: number } | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<BodyAnnotation | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [saved, setSaved] = useState(false);

  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', search],
    queryFn: () => patientsApi.list({ search, limit: 10 }).then(r => r.data),
    enabled: search.length >= 2,
  });
  const patients = patientsData?.data ?? [];

  // Load annotations from localStorage when patient changes
  useEffect(() => {
    if (selectedPatient?.id) {
      const saved = loadAnnotations(selectedPatient.id);
      setAnnotations(saved);
    } else {
      setAnnotations([]);
    }
  }, [selectedPatient?.id]);

  // Auto-save annotations to localStorage whenever they change
  useEffect(() => {
    if (selectedPatient?.id && annotations.length >= 0) {
      saveAnnotations(selectedPatient.id, annotations);
    }
  }, [annotations, selectedPatient?.id]);

  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedPatient) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingClick({ x, y });
    setSelectedAnnotation(null);
  };

  const saveAnnotation = (data: { region: string; pain: PainLevel; symptom: string; notes?: string }) => {
    if (!pendingClick) return;
    const ann: BodyAnnotation = {
      id: Date.now().toString(),
      x: pendingClick.x, y: pendingClick.y,
      date: new Date().toISOString(),
      ...data,
    };
    setAnnotations(prev => {
      const updated = [...prev, ann];
      if (selectedPatient?.id) saveAnnotations(selectedPatient.id, updated);
      return updated;
    });
    setPendingClick(null);
    toast.success('Annotation saved');
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => {
      const updated = prev.filter(a => a.id !== id);
      if (selectedPatient?.id) saveAnnotations(selectedPatient.id, updated);
      return updated;
    });
    if (selectedAnnotation?.id === id) setSelectedAnnotation(null);
  };

  const visibleAnnotations = annotations.filter(a => {
    const regionDef = BODY_REGIONS[a.region];
    if (!regionDef) return true;
    return side === 'front' ? !!regionDef.front : !!regionDef.back;
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-base)]">
      <Header title="Body Diagram" subtitle="Map patient symptoms on a body diagram" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-surface)]">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                placeholder="Search patient…"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            {patients.length > 0 && search.length >= 2 && (
              <div className="mt-1 border border-[var(--border)] rounded-lg overflow-hidden shadow-sm">
                {patients.map((p: any) => (
                  <button key={p.id} onClick={() => { setSelectedPatient(p); setSearch(''); setPendingClick(null); setSelectedAnnotation(null); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-muted)] text-[var(--text-primary)]">
                    {p.firstName} {p.lastName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Annotations list */}
          <div className="flex-1 overflow-y-auto p-3">
            {annotations.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] text-center py-4">
                {selectedPatient ? 'Click on the body diagram to add symptoms' : 'Select a patient to begin'}
              </p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-2">Symptoms ({annotations.length})</p>
                {annotations.slice().reverse().map(ann => (
                  <div key={ann.id}
                    onClick={() => setSelectedAnnotation(selectedAnnotation?.id === ann.id ? null : ann)}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${selectedAnnotation?.id === ann.id ? 'border-[var(--brand)] bg-blue-50/50 dark:bg-blue-950/20' : 'border-[var(--border)] hover:bg-[var(--bg-muted)]'}`}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{ann.region}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">{ann.symptom}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: PAIN_COLORS[ann.pain] }}>
                          {ann.pain}
                        </span>
                        <button onClick={e => { e.stopPropagation(); removeAnnotation(ann.id); }}
                          className="p-0.5 hover:bg-red-100 rounded text-red-400"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pain scale */}
          <div className="p-3 border-t border-[var(--border)]">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1.5">Pain Scale</p>
            <div className="flex rounded-full overflow-hidden h-3">
              {Array.from({ length: 11 }, (_, i) => (
                <div key={i} className="flex-1" style={{ background: PAIN_COLORS[i] }} title={String(i)} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-[var(--text-secondary)] mt-0.5">
              <span>0 None</span><span>5 Mod</span><span>10 Severe</span>
            </div>
          </div>
        </div>

        {/* Body Diagram Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-surface)]">
            <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
              <button onClick={() => setSide('front')}
                className={`px-3 py-1.5 text-xs transition-colors ${side === 'front' ? 'bg-[var(--brand)] text-white' : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]'}`}>
                Front
              </button>
              <button onClick={() => setSide('back')}
                className={`px-3 py-1.5 text-xs transition-colors ${side === 'back' ? 'bg-[var(--brand)] text-white' : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]'}`}>
                Back
              </button>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} className="w-3 h-3" />
              Show Heatmap
            </label>
            {selectedPatient && (
              <span className="text-xs text-[var(--text-secondary)]">
                {selectedPatient.firstName} {selectedPatient.lastName}
                {annotations.length > 0 && ` · ${annotations.length} annotations`}
              </span>
            )}
            {annotations.length > 0 && (
              <button onClick={() => { setAnnotations([]); if (selectedPatient?.id) saveAnnotations(selectedPatient.id, []); }}
                className="ml-auto text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                <X size={12} /> Clear All
              </button>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            {!selectedPatient ? (
              <div className="text-center text-[var(--text-secondary)]">
                <div className="w-24 h-24 mx-auto mb-4 opacity-20 text-[var(--text-primary)]">
                  <BodySilhouette side="front" />
                </div>
                <p className="text-lg font-medium">Human Anatomy Viewer</p>
                <p className="text-sm mt-1 opacity-60">Select a patient to map symptoms</p>
              </div>
            ) : (
              <div className="relative h-full max-h-[560px] w-auto" style={{ aspectRatio: '1/2.2' }}>
                <div
                  className="relative w-full h-full cursor-crosshair text-[var(--text-primary)]"
                  onClick={handleBodyClick}>
                  <BodySilhouette side={side} />

                  {/* Heatmap overlay */}
                  {showHeatmap && visibleAnnotations.map(ann => (
                    <div key={ann.id + '-heat'}
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${12 + ann.pain * 2}px`,
                        height: `${12 + ann.pain * 2}px`,
                        transform: 'translate(-50%, -50%)',
                        background: `radial-gradient(circle, ${PAIN_COLORS[ann.pain]}80, ${PAIN_COLORS[ann.pain]}00)`,
                      }}
                    />
                  ))}

                  {/* Annotation dots */}
                  {visibleAnnotations.map(ann => (
                    <button key={ann.id}
                      onClick={e => { e.stopPropagation(); setSelectedAnnotation(selectedAnnotation?.id === ann.id ? null : ann); }}
                      className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[8px] font-bold z-10 hover:scale-125 transition-transform"
                      style={{
                        left: `${ann.x}%`, top: `${ann.y}%`,
                        transform: 'translate(-50%, -50%)',
                        background: PAIN_COLORS[ann.pain],
                      }}
                      title={`${ann.region}: ${ann.symptom} (Pain ${ann.pain}/10)`}>
                      {ann.pain}
                    </button>
                  ))}

                  {/* Annotation popup on click */}
                  {pendingClick && (
                    <div onClick={e => e.stopPropagation()}>
                      <AnnotationPopup
                        x={pendingClick.x}
                        y={pendingClick.y}
                        onSave={saveAnnotation}
                        onCancel={() => setPendingClick(null)}
                      />
                    </div>
                  )}

                  {/* Selected annotation detail */}
                  {selectedAnnotation && !pendingClick && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="absolute z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-xl p-3 w-48"
                      style={{
                        left: `${Math.min(selectedAnnotation.x + 5, 60)}%`,
                        top: `${Math.min(selectedAnnotation.y, 80)}%`,
                      }}>
                      <div className="flex justify-between mb-1">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{selectedAnnotation.region}</p>
                        <button onClick={() => setSelectedAnnotation(null)}><X size={11} className="text-[var(--text-secondary)]" /></button>
                      </div>
                      <p className="text-xs text-[var(--text-primary)]">{selectedAnnotation.symptom}</p>
                      {selectedAnnotation.notes && <p className="text-[10px] text-[var(--text-secondary)] mt-1">{selectedAnnotation.notes}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: PAIN_COLORS[selectedAnnotation.pain] }}>
                          Pain {selectedAnnotation.pain}/10
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{new Date(selectedAnnotation.date).toLocaleDateString()}</span>
                      </div>
                      <button onClick={() => removeAnnotation(selectedAnnotation.id)}
                        className="mt-2 w-full text-[10px] text-red-500 hover:text-red-600 flex items-center justify-center gap-1">
                        <Trash2 size={10} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
