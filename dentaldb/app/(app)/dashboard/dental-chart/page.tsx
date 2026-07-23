'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { patientsApi } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, Save, RotateCcw, Info, Clock, ChevronDown, ChevronUp, Plus, X, Menu } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type ToothCondition = 'healthy' | 'cavity' | 'filling' | 'crown' | 'extraction' | 'bridge' | 'implant' | 'root_canal' | 'cracked' | 'missing';
type ToothSurface  = 'buccal' | 'lingual' | 'mesial' | 'distal' | 'occlusal';

interface ToothState {
  condition: ToothCondition;
  surfaces:  Partial<Record<ToothSurface, ToothCondition>>;
  notes?:    string;
  lastUpdated?: string;
}

interface DentalChart {
  patientId: string;
  teeth:     Record<number, ToothState>;
  history:   { date: string; tooth: number; change: string; dentist?: string }[];
}

const CONDITION_CONFIG: Record<ToothCondition, { label: string; color: string; bg: string; border: string }> = {
  healthy:     { label: 'Healthy',      color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
  cavity:      { label: 'Cavity',       color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  filling:     { label: 'Filling',      color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
  crown:       { label: 'Crown',        color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
  extraction:  { label: 'Extraction',   color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
  bridge:      { label: 'Bridge',       color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' },
  implant:     { label: 'Implant',      color: '#06b6d4', bg: '#ecfeff', border: '#67e8f9' },
  root_canal:  { label: 'Root Canal',   color: '#dc2626', bg: '#fef2f2', border: '#f87171' },
  cracked:     { label: 'Cracked',      color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  missing:     { label: 'Missing',      color: '#9ca3af', bg: '#f3f4f6', border: '#e5e7eb' },
};

// FDI notation: upper right → upper left → lower left → lower right
const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function toothLabel(n: number): string {
  const map: Record<number, string> = {
    11:'UR1',12:'UR2',13:'UR3',14:'UR4',15:'UR5',16:'UR6',17:'UR7',18:'UR8',
    21:'UL1',22:'UL2',23:'UL3',24:'UL4',25:'UL5',26:'UL6',27:'UL7',28:'UL8',
    31:'LL1',32:'LL2',33:'LL3',34:'LL4',35:'LL5',36:'LL6',37:'LL7',38:'LL8',
    41:'LR1',42:'LR2',43:'LR3',44:'LR4',45:'LR5',46:'LR6',47:'LR7',48:'LR8',
  };
  return map[n] ?? String(n);
}

// Anatomical family by FDI position digit: 1-2 incisor, 3 canine, 4-5 premolar, 6-8 molar
type ToothFamily = 'anterior' | 'premolar' | 'molar';
function toothFamily(n: number): ToothFamily {
  const pos = n % 10;
  if (pos <= 3) return 'anterior';
  if (pos <= 5) return 'premolar';
  return 'molar';
}

// ── Shared SVG definitions (gradients / filter), rendered once ─────────────
function ToothDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="enamelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#fbf8f2" />
          <stop offset="100%" stopColor="#ede6d6" />
        </linearGradient>
        <linearGradient id="rootGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3e3c7" />
          <stop offset="100%" stopColor="#e2c9a0" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="45%" stopColor="#f3c65f" />
          <stop offset="100%" stopColor="#c9922e" />
        </linearGradient>
        <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e5e9ee" />
          <stop offset="50%" stopColor="#aab2bc" />
          <stop offset="100%" stopColor="#7c8590" />
        </linearGradient>
        <filter id="toothShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.55" floodColor="#000000" floodOpacity="0.28" />
        </filter>
      </defs>
    </svg>
  );
}

// ── Single Tooth SVG Component ─────────────────────────────────────────────
function ToothSVG({ number, state, isSelected, onClick }: {
  number: number; state: ToothState; isSelected: boolean; onClick: () => void;
}) {
  const cond    = state.condition;
  const cfg     = CONDITION_CONFIG[cond];
  const isUpper = number <= 28;
  const family  = toothFamily(number);

  // Canonical frame is drawn "upper" (root near top, crown near bottom).
  // For lower teeth we mirror every y-coordinate about the vertical center
  // so the crown sits toward the bite line and the root points into the jaw.
  const VBH = 34;
  const Y = (y: number) => (isUpper ? y : VBH - y);

  const isMissing = cond === 'missing';

  // Crown geometry by tooth family (x, y, w, h, rx — y is the TOP edge in canonical frame)
  const crownGeo = family === 'anterior'
    ? { x: 7,  y: 13, w: 10, h: 18, rx: 5 }
    : family === 'premolar'
    ? { x: 5,  y: 13, w: 14, h: 15, rx: 4 }
    : { x: 3,  y: 13, w: 18, h: 14, rx: 3.2 };

  // Root path(s) in canonical (upper) frame
  const rootPath = family === 'anterior'
    ? 'M8,15 C8,10 9,5 12,1.5 C15,5 16,10 16,15 Z'
    : family === 'premolar'
    ? 'M7,15 C7,9.5 8,4.5 10,2 C10.5,3.5 11,5.5 11,7 C11,5.5 11.7,3.5 12,2.3 C12.3,3.5 13,5.5 13,7 C13,5.5 13.5,3.5 14,2 C16,4.5 17,9.5 17,15 Z'
    : 'M4.5,15 C4.5,10.5 5,7 7,5.5 C8.5,7 9,10.5 9,15 Z M15,15 C15,10.5 15.5,7 17,5.5 C19,7 19.5,10.5 19.5,15 Z';

  // Build a mirrored rect (path) for the crown since <rect> can't be y-flipped point-by-point easily
  const crownTop    = Y(crownGeo.y);
  const crownBottom = Y(crownGeo.y + crownGeo.h);
  const crownY      = Math.min(crownTop, crownBottom);
  const crownH      = Math.abs(crownBottom - crownTop);

  // Mirror the root path's y-coordinates when lower arch
  const mirroredRootPath = isUpper
    ? rootPath
    : rootPath.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, x, y) => `${x},${(VBH - parseFloat(y)).toFixed(2)}`);

  // Occlusal edge (biting edge) y — the far side of the crown from the root
  const occlusalY = isUpper ? crownBottom : crownTop;
  const occlusalDir = isUpper ? -1 : 1; // direction to move "inward" from the biting edge

  const strokeColor = isSelected ? '#2563eb' : (cond === 'crown' ? cfg.border : 'var(--tooth-line, #d8cdb8)');
  const crownFill = cond === 'crown' ? 'url(#goldGrad)' : 'url(#enamelGrad)';
  const rootFill  = cond === 'implant' ? 'url(#metalGrad)' : 'url(#rootGrad)';

  return (
    <button
      onClick={onClick}
      title={`Tooth ${number} (${toothLabel(number)}) — ${cfg.label}`}
      className="flex flex-col items-center gap-0.5 group transition-transform active:scale-95 hover:scale-110 p-0.5"
    >
      {isUpper && (
        <span className="text-[8px] text-[var(--text-secondary)] leading-none">{number}</span>
      )}
      <svg
        width="26" height="30"
        viewBox={`0 0 24 ${VBH}`}
        className="overflow-visible w-6 h-8 sm:w-7 sm:h-9"
      >
        {isMissing ? (
          /* Ghost outline only — tooth is gone */
          <>
            <path d={mirroredRootPath} fill="none" stroke="#c7ccd4" strokeWidth="0.6" strokeDasharray="1.4,1.2" opacity="0.4" />
            <rect x={crownGeo.x} y={crownY} width={crownGeo.w} height={crownH} rx={crownGeo.rx}
              fill="none" stroke="#c7ccd4" strokeWidth="0.6" strokeDasharray="1.4,1.2" opacity="0.4" />
          </>
        ) : (
          <>
            {/* Root(s) */}
            <path d={mirroredRootPath} fill={rootFill} stroke="#cbb488" strokeWidth="0.4" opacity={0.95} />

            {/* Root canal filling marker */}
            {cond === 'root_canal' && (
              <line x1="12" y1={Y(14)} x2="12" y2={Y(3)} stroke="#b91c1c" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
            )}

            {/* Implant threads */}
            {cond === 'implant' && [4, 6.5, 9, 11.5].map((yy, i) => (
              <line key={i} x1="5.5" y1={Y(yy)} x2="18.5" y2={Y(yy)} stroke="#5b6470" strokeWidth="0.4" opacity="0.5" />
            ))}

            {/* Crown */}
            <rect
              x={crownGeo.x} y={crownY} width={crownGeo.w} height={crownH} rx={crownGeo.rx}
              fill={crownFill}
              stroke={strokeColor}
              strokeWidth={isSelected ? 1.4 : 0.9}
              filter="url(#toothShadow)"
            />

            {/* Occlusal cusps / fissure texture for back teeth */}
            {cond !== 'crown' && family === 'premolar' && (
              <>
                <circle cx="9"  cy={occlusalY + occlusalDir * 2.2} r="1.6" fill="#00000010" />
                <circle cx="15" cy={occlusalY + occlusalDir * 2.2} r="1.6" fill="#00000010" />
                <line x1="9" y1={occlusalY + occlusalDir * 2.2} x2="15" y2={occlusalY + occlusalDir * 2.2}
                  stroke="#00000018" strokeWidth="0.5" />
              </>
            )}
            {cond !== 'crown' && family === 'molar' && (
              <>
                <circle cx="7.5"  cy={occlusalY + occlusalDir * 2} r="1.5" fill="#00000010" />
                <circle cx="12"   cy={occlusalY + occlusalDir * 2.6} r="1.5" fill="#00000010" />
                <circle cx="16.5" cy={occlusalY + occlusalDir * 2} r="1.5" fill="#00000010" />
                <path d={`M7.5,${occlusalY + occlusalDir * 2} Q12,${occlusalY + occlusalDir * 3.4} 16.5,${occlusalY + occlusalDir * 2}`}
                  fill="none" stroke="#00000018" strokeWidth="0.5" />
              </>
            )}

            {/* Glossy enamel highlight */}
            {cond !== 'crown' && (
              <ellipse cx={crownGeo.x + crownGeo.w * 0.32} cy={crownY + crownH * 0.28}
                rx={crownGeo.w * 0.18} ry={crownH * 0.32} fill="#ffffff" opacity="0.55" />
            )}
            {cond === 'crown' && (
              <ellipse cx={crownGeo.x + crownGeo.w * 0.3} cy={crownY + crownH * 0.25}
                rx={crownGeo.w * 0.16} ry={crownH * 0.22} fill="#fff6d8" opacity="0.7" />
            )}

            {/* Condition overlays */}
            {cond === 'cavity' && (
              <circle cx="12" cy={crownY + crownH * 0.45} r="2.1" fill="#3f2a1a" opacity="0.85" />
            )}
            {cond === 'filling' && (
              <rect x="9.8" y={crownY + crownH * 0.32} width="4.2" height="4.2" rx="0.8" fill="#b8c0c9" stroke="#8a94a0" strokeWidth="0.35" />
            )}
            {cond === 'bridge' && (
              <rect
                x={isUpper ? crownGeo.x + crownGeo.w - 1 : crownGeo.x - 2}
                y={crownY + crownH * 0.4} width="3.2" height="2.4" rx="0.6"
                fill={cfg.color} opacity="0.55"
              />
            )}
            {cond === 'cracked' && (
              <path d={`M12,${crownY + 1} L10.5,${crownY + crownH * 0.4} L13,${crownY + crownH * 0.55} L11,${crownY + crownH - 1.5}`}
                fill="none" stroke="#3f3f46" strokeWidth="0.55" strokeLinecap="round" />
            )}
            {cond === 'extraction' && (
              <line x1={crownGeo.x + 1} y1={crownY + 1.5} x2={crownGeo.x + crownGeo.w - 1} y2={crownY + crownH - 1.5}
                stroke={cfg.color} strokeWidth="1" strokeLinecap="round" opacity="0.75" />
            )}

            {/* Selection ring */}
            {isSelected && (
              <rect x="1.5" y="1" width="21" height="32" rx="6" fill="none"
                stroke="#2563eb" strokeWidth="1" strokeDasharray="2,1.6" opacity="0.85" />
            )}
          </>
        )}
      </svg>
      {!isUpper && (
        <span className="text-[8px] text-[var(--text-secondary)] leading-none">{number}</span>
      )}
    </button>
  );
}

// ── Tooth Detail Panel ─────────────────────────────────────────────────────
function ToothDetailPanel({ tooth, state, onUpdate, onClose, history }: {
  tooth: number; state: ToothState;
  onUpdate: (s: ToothState) => void;
  onClose: () => void;
  history: DentalChart['history'];
}) {
  const cfg = CONDITION_CONFIG[state.condition];
  const toothHistory = history.filter(h => h.tooth === tooth).slice().reverse();

  return (
    <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--bg-surface)] flex flex-col overflow-hidden rounded-t-2xl md:rounded-none max-h-[80vh] md:max-h-none animate-slide-up">
      {/* Drag handle — mobile only */}
      <div className="md:hidden flex justify-center pt-2 pb-0.5 shrink-0">
        <span className="w-9 h-1 rounded-full bg-[var(--border-hover)]" />
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Tooth {tooth} · {toothLabel(tooth)}
          </h3>
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--bg-muted)]"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Condition selector */}
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">Condition</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map(c => {
              const cc = CONDITION_CONFIG[c];
              return (
                <button key={c} onClick={() => onUpdate({ ...state, condition: c, lastUpdated: new Date().toISOString() })}
                  className="flex items-center gap-1.5 px-2 py-2 sm:py-1.5 rounded-lg text-xs border transition-all"
                  style={{
                    background: state.condition === c ? cc.bg : 'transparent',
                    borderColor: state.condition === c ? cc.border : 'var(--border)',
                    color: state.condition === c ? cc.color : 'var(--text-secondary)',
                    fontWeight: state.condition === c ? 600 : 400,
                  }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cc.color }} />
                  {cc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Surface conditions */}
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">Surface Conditions</label>
          <div className="relative w-28 h-28 sm:w-24 sm:h-24 mx-auto">
            {/* Simple surface diagram */}
            {(['occlusal', 'buccal', 'lingual', 'mesial', 'distal'] as ToothSurface[]).map((surf, i) => {
              const positions: Record<ToothSurface, { x: number; y: number; w: number; h: number; label: string }> = {
                occlusal: { x: 25, y: 25, w: 46, h: 46, label: 'O' },
                buccal:   { x: 35, y: 4,  w: 26, h: 20, label: 'B' },
                lingual:  { x: 35, y: 72, w: 26, h: 20, label: 'Li' },
                mesial:   { x: 4,  y: 35, w: 20, h: 26, label: 'M' },
                distal:   { x: 72, y: 35, w: 20, h: 26, label: 'D' },
              };
              const pos = positions[surf];
              const sc  = state.surfaces?.[surf];
              const scCfg = sc ? CONDITION_CONFIG[sc] : null;
              return (
                <button key={surf}
                  onClick={() => {
                    const next = sc ? undefined : (state.condition !== 'healthy' ? state.condition : 'cavity');
                    onUpdate({ ...state, surfaces: { ...state.surfaces, [surf]: next } });
                  }}
                  className="absolute text-[9px] sm:text-[8px] font-bold rounded border transition-colors"
                  style={{
                    left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.w}%`, height: `${pos.h}%`,
                    background: scCfg?.bg ?? '#f9fafb',
                    borderColor: scCfg?.border ?? '#e5e7eb',
                    color: scCfg?.color ?? '#6b7280',
                  }}
                  title={`${surf} surface`}>
                  {pos.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] text-center mt-1">Click surfaces to mark conditions</p>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Notes</label>
          <textarea
            className="w-full px-2 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] resize-none"
            rows={3}
            value={state.notes ?? ''}
            onChange={e => onUpdate({ ...state, notes: e.target.value })}
            placeholder="Clinical notes…"
          />
        </div>

        {/* History */}
        {toothHistory.length > 0 && (
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
              <Clock size={11} /> Treatment History
            </label>
            <div className="space-y-1">
              {toothHistory.slice(0, 5).map((h, i) => (
                <div key={i} className="text-xs px-2 py-1.5 bg-[var(--bg-muted)] rounded">
                  <p className="text-[var(--text-primary)]">{h.change}</p>
                  <p className="text-[var(--text-secondary)] text-[10px]">{new Date(h.date).toLocaleDateString()}{h.dentist ? ` · ${h.dentist}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DentalChartPage() {
  const { clinic } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch]           = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedTooth, setSelectedTooth]     = useState<number | null>(null);
  const [chart, setChart]             = useState<DentalChart | null>(null);
  const [dirty, setDirty]             = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', search],
    queryFn: () => patientsApi.list({ search, limit: 10 }).then(r => r.data),
    enabled: search.length >= 2,
  });
  const patients = patientsData?.data ?? [];

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['dental-chart', selectedPatient?.id],
    queryFn: async () => {
      const r = await (api as any).get(`/dental-chart/${selectedPatient.id}`).catch(() => null);
      return r?.data ?? null;
    },
    enabled: !!selectedPatient?.id,
  });

  // Sync fetched chart into local state (replaces onSuccess which is removed in TanStack v5)
  useEffect(() => {
    if (chartData !== undefined) {
      if (chartData) {
        setChart(chartData as DentalChart);
      } else if (selectedPatient) {
        initBlankChart(selectedPatient);
      }
    }
  }, [chartData, selectedPatient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMut = useMutation({
    mutationFn: (c: DentalChart) =>
      (api as any).post(`/dental-chart/${c.patientId}`, c).catch(() =>
        (api as any).put(`/dental-chart/${c.patientId}`, c)
      ),
    onSuccess: () => { toast.success('Chart saved'); setDirty(false); qc.invalidateQueries({ queryKey: ['dental-chart', selectedPatient?.id] }); },
    onError: () => toast.error('Save failed — chart stored locally'),
  });

  const initBlankChart = (patient: any) => {
    const blank: DentalChart = { patientId: patient.id, teeth: {}, history: [] };
    [...UPPER_TEETH, ...LOWER_TEETH].forEach(n => {
      blank.teeth[n] = { condition: 'healthy', surfaces: {} };
    });
    setChart(blank);
  };

  const getToothState = (n: number): ToothState =>
    chart?.teeth[n] ?? { condition: 'healthy', surfaces: {} };

  const updateTooth = (n: number, state: ToothState) => {
    if (!chart) return;
    const prev = chart.teeth[n];
    const historyEntry = prev?.condition !== state.condition
      ? { date: new Date().toISOString(), tooth: n, change: `${CONDITION_CONFIG[prev?.condition ?? 'healthy'].label} → ${CONDITION_CONFIG[state.condition].label}` }
      : null;
    setChart(c => c ? {
      ...c,
      teeth: { ...c.teeth, [n]: state },
      history: historyEntry ? [...(c.history ?? []), historyEntry] : (c.history ?? []),
    } : c);
    setDirty(true);
  };

  // Condition summary — explicit type so indexing returns number not unknown
  const summary: Partial<Record<ToothCondition, number>> = chart
    ? Object.values(chart.teeth).reduce((acc, s) => {
        const cond = s.condition as ToothCondition;
        acc[cond] = (acc[cond] ?? 0) + 1;
        return acc;
      }, {} as Partial<Record<ToothCondition, number>>)
    : {};

  const renderRow = (teeth: number[], label: string) => (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-medium text-[var(--text-secondary)] uppercase">{label}</span>
      <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap justify-center">
        {teeth.map(n => (
          <ToothSVG
            key={n}
            number={n}
            state={getToothState(n)}
            isSelected={selectedTooth === n}
            onClick={() => setSelectedTooth(selectedTooth === n ? null : n)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <ToothDefs />

      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed md:relative inset-y-0 left-0 z-40 md:z-auto w-72 max-w-[85vw] md:w-60 md:max-w-none shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-surface)] transform transition-transform duration-200 md:transform-none ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-2">
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">Dental Chart</h1>
          <button onClick={() => setMobileSidebarOpen(false)} className="md:hidden p-1 rounded hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]">
            <X size={16} />
          </button>
        </div>
        <div className="px-4 pt-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              placeholder="Search patient…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {patients.length > 0 && search.length >= 2 && (
            <div className="mt-1 border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-surface)] shadow-sm">
              {patients.map((p: any) => (
                <button key={p.id} onClick={() => {
                  setSelectedPatient(p); setSearch(''); setSelectedTooth(null); setDirty(false);
                  initBlankChart(p);
                  setMobileSidebarOpen(false);
                }}
                  className="w-full text-left px-3 py-2.5 sm:py-2 text-xs hover:bg-[var(--bg-muted)] text-[var(--text-primary)]">
                  {p.firstName} {p.lastName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Condition Legend */}
        <div className="p-3 mt-2 border-b border-[var(--border)] flex-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-2">Legend</p>
          <div className="space-y-1">
            {(Object.entries(CONDITION_CONFIG) as [ToothCondition, typeof CONDITION_CONFIG[ToothCondition]][]).map(([cond, cfg]) => (
              <div key={cond} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                  <span className="text-xs text-[var(--text-primary)]">{cfg.label}</span>
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">{summary[cond] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedPatient && dirty && (
          <div className="p-3 border-t border-[var(--border)]">
            <button onClick={() => chart && saveMut.mutate(chart)}
              disabled={saveMut.isPending}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 sm:py-2 text-xs bg-[var(--brand)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              <Save size={12} /> {saveMut.isPending ? 'Saving…' : 'Save Chart'}
            </button>
          </div>
        )}
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-3 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
          <button onClick={() => setMobileSidebarOpen(true)} className="p-2 -ml-1 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-primary)] shrink-0">
            <Menu size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Dental Chart'}
            </p>
          </div>
          {selectedPatient && dirty && (
            <span className="text-[9px] text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">Unsaved</span>
          )}
          {selectedPatient && (
            <button onClick={() => { initBlankChart(selectedPatient); setDirty(false); }}
              className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] shrink-0" title="Reset">
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {!selectedPatient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)] px-4">
            <svg viewBox="0 0 100 60" className="w-32 h-20 mb-4 opacity-25">
              {[0,1,2,3,4,5,6,7].map(i => (
                <g key={i}>
                  <rect x={8 + i*11} y={5} width={9} height={16} rx={3.5} fill="#9ca3af" />
                  <rect x={8 + i*11} y={39} width={9} height={16} rx={3.5} fill="#9ca3af" />
                </g>
              ))}
            </svg>
            <p className="text-lg font-medium text-center">Dental Charting</p>
            <p className="text-sm mt-1 opacity-60 text-center">Search for a patient to open their dental chart</p>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden md:flex px-6 py-3 border-b border-[var(--border)] items-center justify-between bg-[var(--bg-surface)]">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p className="text-xs text-[var(--text-secondary)]">FDI Notation · {Object.values(summary).reduce((a: number, b) => a + (b ?? 0), 0)} teeth charted</p>
              </div>
              <div className="flex items-center gap-2">
                {dirty && <span className="text-[10px] text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200">Unsaved changes</span>}
                <button onClick={() => { initBlankChart(selectedPatient); setDirty(false); }}
                  className="p-1.5 rounded border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]" title="Reset">
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
              {/* Chart */}
              <div className="flex-1 overflow-auto p-3 sm:p-6">
                <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
                  {/* Upper arch label */}
                  <div className="text-center">
                    <span className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Upper Arch (Maxillary)</span>
                  </div>

                  {renderRow(UPPER_TEETH, 'Upper Right → Upper Left')}

                  {/* Midline */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-[var(--border)] border-dashed" />
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase">Midline</span>
                    <div className="flex-1 h-px bg-[var(--border)]" style={{ borderStyle: 'dashed' }} />
                  </div>

                  {renderRow(LOWER_TEETH, 'Lower Right → Lower Left')}

                  <div className="text-center">
                    <span className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Lower Arch (Mandibular)</span>
                  </div>

                  {/* Summary grid */}
                  <div className="mt-6 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                    {(Object.entries(CONDITION_CONFIG) as [ToothCondition, typeof CONDITION_CONFIG[ToothCondition]][])
                      .filter(([c]) => summary[c] > 0)
                      .map(([cond, cfg]) => (
                        <div key={cond} className="text-center p-2 rounded-lg border" style={{ background: cfg.bg, borderColor: cfg.border }}>
                          <p className="text-lg font-bold" style={{ color: cfg.color }}>{summary[cond]}</p>
                          <p className="text-[9px]" style={{ color: cfg.color }}>{cfg.label}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Tooth detail panel — side panel on desktop, bottom sheet on mobile */}
              {selectedTooth && chart && (
                <div className="fixed md:relative inset-x-0 bottom-0 md:inset-auto z-40 md:z-auto">
                  <ToothDetailPanel
                    tooth={selectedTooth}
                    state={getToothState(selectedTooth)}
                    onUpdate={s => updateTooth(selectedTooth, s)}
                    onClose={() => setSelectedTooth(null)}
                    history={chart.history ?? []}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}