'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, Save, Palette, FileText, Sparkles, Check,
  Receipt, Stethoscope, FlaskConical, Landmark,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  billingTemplateApi, prescriptionsApi, labReportTemplateApi, clinicsApi,
} from '@/lib/api';

const PRESET_COLORS = [
  { label: 'Brand Blue', value: '#027cc6' },
  { label: 'Slate',      value: '#475569' },
  { label: 'Emerald',    value: '#059669' },
  { label: 'Violet',     value: '#7c3aed' },
  { label: 'Rose',       value: '#e11d48' },
  { label: 'Amber',      value: '#d97706' },
  { label: 'Teal',       value: '#0d9488' },
  { label: 'Indigo',     value: '#4338ca' },
];

type DocType = 'invoice' | 'prescription' | 'lab-report' | 'balance-sheet';

const DOC_TYPES: { id: DocType; label: string; icon: any; blurb: string }[] = [
  { id: 'invoice',       label: 'Invoice',       icon: Receipt,       blurb: 'Branding for generated invoices, printed at billing time.' },
  { id: 'prescription',  label: 'Prescription',  icon: Stethoscope,   blurb: 'Branding for Rx pads printed after a consultation.' },
  { id: 'lab-report',    label: 'Lab Report',    icon: FlaskConical,  blurb: 'Branding for grouped-panel lab reports.' },
  { id: 'balance-sheet', label: 'Balance Sheet', icon: Landmark,      blurb: 'Branding for financial statements (Finance module).' },
];

// ─── Template presets ───────────────────────────────────────────────────────
// One-click starting points layered on top of the existing themeColor +
// display-option fields — no new storage or rendering path, so the "exact
// PDF, sample data" preview guarantee still holds for every preset exactly
// like it does for a manually-picked color. Applying a preset just stages
// those field values; nothing is written until Save, same as any other edit.
type InvoicePreset = {
  name: string; themeColor: string;
  showLogo: boolean; showLicenseNumber: boolean; showVatNumber: boolean; showRegistrationNumber: boolean;
};
const INVOICE_PRESETS: InvoicePreset[] = [
  { name: 'Classic Blue',   themeColor: '#027cc6', showLogo: true,  showLicenseNumber: true,  showVatNumber: true,  showRegistrationNumber: false },
  { name: 'Minimal Slate',  themeColor: '#475569', showLogo: false, showLicenseNumber: false, showVatNumber: false, showRegistrationNumber: false },
  { name: 'Fresh Emerald',  themeColor: '#059669', showLogo: true,  showLicenseNumber: false, showVatNumber: true,  showRegistrationNumber: false },
  { name: 'Elegant Violet', themeColor: '#7c3aed', showLogo: true,  showLicenseNumber: true,  showVatNumber: true,  showRegistrationNumber: true  },
  { name: 'Bold Rose',      themeColor: '#e11d48', showLogo: true,  showLicenseNumber: false, showVatNumber: true,  showRegistrationNumber: false },
  { name: 'Warm Amber',     themeColor: '#d97706', showLogo: false, showLicenseNumber: true,  showVatNumber: false, showRegistrationNumber: true  },
];

type PrescriptionPreset = {
  name: string; themeColor: string;
  showLogo: boolean; showLicenseNumber: boolean; showPatientAge: boolean; showPatientGender: boolean; showDoctorName: boolean;
};
const PRESCRIPTION_PRESETS: PrescriptionPreset[] = [
  { name: 'Clinical Classic', themeColor: '#0369a1', showLogo: true,  showLicenseNumber: true,  showPatientAge: true,  showPatientGender: true,  showDoctorName: true  },
  { name: 'Clean Minimal',    themeColor: '#475569', showLogo: false, showLicenseNumber: false, showPatientAge: true,  showPatientGender: false, showDoctorName: true  },
  { name: 'Friendly Teal',    themeColor: '#0d9488', showLogo: true,  showLicenseNumber: false, showPatientAge: true,  showPatientGender: true,  showDoctorName: true  },
  { name: 'Formal Indigo',    themeColor: '#4338ca', showLogo: true,  showLicenseNumber: true,  showPatientAge: false, showPatientGender: false, showDoctorName: true  },
  { name: 'Soft Rose',        themeColor: '#e11d48', showLogo: true,  showLicenseNumber: false, showPatientAge: true,  showPatientGender: true,  showDoctorName: false },
];

type LabReportPreset = {
  name: string; themeColor: string;
  showLogo: boolean; showLicenseNumber: boolean; showMethodColumn: boolean; zebraStripes: boolean;
};
const LAB_REPORT_PRESETS: LabReportPreset[] = [
  { name: 'Standard Blue',  themeColor: '#027cc6', showLogo: false, showLicenseNumber: false, showMethodColumn: true,  zebraStripes: false },
  { name: 'Detailed Slate', themeColor: '#475569', showLogo: true,  showLicenseNumber: true,  showMethodColumn: true,  zebraStripes: true  },
  { name: 'Clean Emerald',  themeColor: '#059669', showLogo: false, showLicenseNumber: false, showMethodColumn: false, zebraStripes: true  },
  { name: 'Formal Indigo',  themeColor: '#4338ca', showLogo: true,  showLicenseNumber: true,  showMethodColumn: true,  zebraStripes: false },
];

function PresetGrid<T extends { name: string; themeColor: string }>({
  presets, activeColor, onApply,
}: { presets: T[]; activeColor: string; onApply: (p: T) => void }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-1.5">
        <Sparkles size={13} className="text-[var(--text-muted)]" />
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Templates</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {presets.map(p => {
          const isActive = p.themeColor.toLowerCase() === activeColor.toLowerCase();
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => onApply(p)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/5"
              style={{ border: `1px solid ${isActive ? p.themeColor : 'var(--border)'}` }}
            >
              <span
                className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center shadow-sm"
                style={{ background: p.themeColor }}
              >
                {isActive && <Check size={13} className="text-white" />}
              </span>
              <span className="text-xs font-medium text-[var(--text-primary)] leading-tight">{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-gray-600'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function ThemeColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [customColor, setCustomColor] = useState(value);
  useEffect(() => setCustomColor(value), [value]);

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-1.5">
        <Palette size={13} className="text-[var(--text-muted)]" />
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Brand Color</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(c => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => onChange(c.value)}
            className="w-8 h-8 rounded-lg transition-transform hover:scale-110 shadow-md"
            style={{ background: c.value, outline: value === c.value ? `3px solid ${c.value}` : 'none', outlineOffset: 2 }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg shadow-md shrink-0 border border-white/10" style={{ background: value }} />
        <div className="flex-1">
          <label className="text-xs text-[var(--text-muted)] block mb-1">Custom hex color</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customColor}
              onChange={e => setCustomColor(e.target.value)}
              onBlur={() => {
                const hex = customColor.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex);
                else toast.error('Enter a valid hex color (e.g. #027cc6)');
              }}
              placeholder="#027cc6"
              className="input flex-1 font-mono text-sm"
              maxLength={7}
            />
            <input
              type="color"
              value={value}
              onChange={e => { onChange(e.target.value); setCustomColor(e.target.value); }}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
              style={{ background: 'var(--bg-elevated)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewPane({ src, refreshKey, isPdf = true }: { src: string; refreshKey: number; isPdf?: boolean }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
      >
        <p className="text-xs font-medium text-[var(--text-muted)]">
          {isPdf ? 'Live preview — exact PDF, sample data' : 'Live preview (sample data)'}
        </p>
      </div>
      <iframe
        key={refreshKey}
        src={src}
        className="w-full border-none"
        style={{ height: 560, background: '#f3f4f6' }}
        title="Document template preview"
      />
    </div>
  );
}

// ─── Invoice panel ─────────────────────────────────────────────────────────
function InvoicePanel() {
  const qc = useQueryClient();
  const { data: tpl, isLoading } = useQuery({ queryKey: ['billing-template'], queryFn: () => billingTemplateApi.get().then(r => r.data) });

  const [themeColor, setThemeColor] = useState('#027cc6');
  const [showLogo, setShowLogo] = useState(false);
  const [showLicenseNumber, setShowLicenseNumber] = useState(false);
  const [showVatNumber, setShowVatNumber] = useState(false);
  const [showRegistrationNumber, setShowRegistrationNumber] = useState(false);
  const [headerNote, setHeaderNote] = useState('');
  const [footerNote, setFooterNote] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!tpl) return;
    setThemeColor(tpl.themeColor || '#027cc6');
    setShowLogo(tpl.showLogo === true);
    setShowLicenseNumber(tpl.showLicenseNumber === true);
    setShowVatNumber(tpl.showVatNumber === true);
    setShowRegistrationNumber(tpl.showRegistrationNumber === true);
    setHeaderNote(tpl.headerNote || '');
    setFooterNote(tpl.footerNote || '');
  }, [tpl]);

  const saveMutation = useMutation({
    mutationFn: () => billingTemplateApi.update({
      themeColor, showLogo, showLicenseNumber, showVatNumber, showRegistrationNumber,
      headerNote: headerNote || null, footerNote: footerNote || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-template'] });
      setRefreshKey(k => k + 1);
      toast.success('Invoice template saved');
    },
    onError: () => toast.error('Failed to save invoice template'),
  });

  if (isLoading) return <CenteredSpinner />;

  return (
    <div className="space-y-6">
      <PresetGrid
        presets={INVOICE_PRESETS}
        activeColor={themeColor}
        onApply={p => {
          setThemeColor(p.themeColor);
          setShowLogo(p.showLogo);
          setShowLicenseNumber(p.showLicenseNumber);
          setShowVatNumber(p.showVatNumber);
          setShowRegistrationNumber(p.showRegistrationNumber);
        }}
      />
      <ThemeColorPicker value={themeColor} onChange={setThemeColor} />
      <div className="rounded-xl px-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-4 pb-1">Display Options</p>
        <ToggleRow label="Show clinic logo" checked={showLogo} onChange={setShowLogo} />
        <ToggleRow label="Show license number" checked={showLicenseNumber} onChange={setShowLicenseNumber} />
        <ToggleRow label="Show registration number" checked={showRegistrationNumber} onChange={setShowRegistrationNumber} />
        <ToggleRow label="Show PAN/VAT number" checked={showVatNumber} onChange={setShowVatNumber} />
        <div className="pb-1" />
      </div>
      <NotesFields headerNote={headerNote} setHeaderNote={setHeaderNote} footerNote={footerNote} setFooterNote={setFooterNote} />
      <PreviewPane src={billingTemplateApi.previewUrl()} refreshKey={refreshKey} isPdf={false} />
      <SaveBar mutation={saveMutation} />
    </div>
  );
}

// ─── Prescription panel ────────────────────────────────────────────────────
function PrescriptionPanel() {
  const qc = useQueryClient();
  const { data: tpl, isLoading } = useQuery({ queryKey: ['prescription-template'], queryFn: () => prescriptionsApi.getTemplate().then(r => r.data) });

  const [themeColor, setThemeColor] = useState('#0369a1');
  const [showLogo, setShowLogo] = useState(true);
  const [showLicenseNumber, setShowLicenseNumber] = useState(false);
  const [showPatientAge, setShowPatientAge] = useState(true);
  const [showPatientGender, setShowPatientGender] = useState(true);
  const [showDoctorName, setShowDoctorName] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!tpl) return;
    setThemeColor(tpl.themeColor || '#0369a1');
    setShowLogo(tpl.showLogo !== false);
    setShowLicenseNumber(tpl.showLicenseNumber === true);
    setShowPatientAge(tpl.showPatientAge !== false);
    setShowPatientGender(tpl.showPatientGender !== false);
    setShowDoctorName(tpl.showDoctorName !== false);
  }, [tpl]);

  const saveMutation = useMutation({
    mutationFn: () => prescriptionsApi.updateTemplate({
      themeColor, showLogo, showLicenseNumber, showPatientAge, showPatientGender, showDoctorName,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescription-template'] });
      setRefreshKey(k => k + 1);
      toast.success('Prescription template saved');
    },
    onError: () => toast.error('Failed to save prescription template'),
  });

  if (isLoading) return <CenteredSpinner />;

  return (
    <div className="space-y-6">
      <PresetGrid
        presets={PRESCRIPTION_PRESETS}
        activeColor={themeColor}
        onApply={p => {
          setThemeColor(p.themeColor);
          setShowLogo(p.showLogo);
          setShowLicenseNumber(p.showLicenseNumber);
          setShowPatientAge(p.showPatientAge);
          setShowPatientGender(p.showPatientGender);
          setShowDoctorName(p.showDoctorName);
        }}
      />
      <ThemeColorPicker value={themeColor} onChange={setThemeColor} />
      <div className="rounded-xl px-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-4 pb-1">Display Options</p>
        <ToggleRow label="Show clinic logo" checked={showLogo} onChange={setShowLogo} />
        <ToggleRow label="Show license number" checked={showLicenseNumber} onChange={setShowLicenseNumber} />
        <ToggleRow label="Show patient age" checked={showPatientAge} onChange={setShowPatientAge} />
        <ToggleRow label="Show patient gender" checked={showPatientGender} onChange={setShowPatientGender} />
        <ToggleRow label="Show doctor name" checked={showDoctorName} onChange={setShowDoctorName} />
        <div className="pb-1" />
      </div>
      <PreviewPane src={prescriptionsApi.templatePreviewUrl()} refreshKey={refreshKey} isPdf={false} />
      <SaveBar mutation={saveMutation} />
    </div>
  );
}

// ─── Lab Report panel ──────────────────────────────────────────────────────
function LabReportPanel() {
  const qc = useQueryClient();
  const { data: tpl, isLoading } = useQuery({ queryKey: ['lab-report-template'], queryFn: () => labReportTemplateApi.get().then(r => r.data) });

  const [themeColor, setThemeColor] = useState('#027cc6');
  const [showLogo, setShowLogo] = useState(false);
  const [showLicenseNumber, setShowLicenseNumber] = useState(false);
  const [showMethodColumn, setShowMethodColumn] = useState(true);
  const [zebraStripes, setZebraStripes] = useState(false);
  const [headerNote, setHeaderNote] = useState('');
  const [footerNote, setFooterNote] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!tpl) return;
    setThemeColor(tpl.themeColor || '#027cc6');
    setShowLogo(tpl.showLogo === true);
    setShowLicenseNumber(tpl.showLicenseNumber === true);
    setShowMethodColumn(tpl.showMethodColumn !== false);
    setZebraStripes(tpl.zebraStripes === true);
    setHeaderNote(tpl.headerNote || '');
    setFooterNote(tpl.footerNote || '');
  }, [tpl]);

  const saveMutation = useMutation({
    mutationFn: () => labReportTemplateApi.update({
      themeColor, showLogo, showLicenseNumber, showMethodColumn, zebraStripes,
      headerNote: headerNote || null, footerNote: footerNote || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-report-template'] });
      setRefreshKey(k => k + 1);
      toast.success('Lab report template saved');
    },
    onError: () => toast.error('Failed to save lab report template'),
  });

  if (isLoading) return <CenteredSpinner />;

  return (
    <div className="space-y-6">
      <PresetGrid
        presets={LAB_REPORT_PRESETS}
        activeColor={themeColor}
        onApply={p => {
          setThemeColor(p.themeColor);
          setShowLogo(p.showLogo);
          setShowLicenseNumber(p.showLicenseNumber);
          setShowMethodColumn(p.showMethodColumn);
          setZebraStripes(p.zebraStripes);
        }}
      />
      <ThemeColorPicker value={themeColor} onChange={setThemeColor} />
      <div className="rounded-xl px-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-4 pb-1">Display Options</p>
        <ToggleRow label="Show clinic logo" checked={showLogo} onChange={setShowLogo} />
        <ToggleRow label="Show license number" checked={showLicenseNumber} onChange={setShowLicenseNumber} />
        <div className="pb-1" />
      </div>
      <div className="rounded-xl px-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-4 pb-1">Panel Table Styling</p>
        <ToggleRow label="Show Method column" description="Test method, e.g. IFCC, Jaffe" checked={showMethodColumn} onChange={setShowMethodColumn} />
        <ToggleRow label="Zebra-striped rows" description="Alternating row shading for readability on dense panels" checked={zebraStripes} onChange={setZebraStripes} />
        <div className="pb-1" />
      </div>
      <NotesFields headerNote={headerNote} setHeaderNote={setHeaderNote} footerNote={footerNote} setFooterNote={setFooterNote} />
      <PreviewPane src={labReportTemplateApi.previewUrl()} refreshKey={refreshKey} isPdf />
      <SaveBar mutation={saveMutation} />
    </div>
  );
}

// ─── Balance Sheet panel ───────────────────────────────────────────────────
// No finance module exists yet (Phase 9) — this configures branding ahead of
// time via the generic clinic-settings endpoint, same JSON-column pattern as
// the other three, and reuses PATCH /clinics/me since there's no dedicated
// finance controller to own a narrower one yet.
function BalanceSheetPanel() {
  const qc = useQueryClient();
  const { data: clinic, isLoading } = useQuery({ queryKey: ['clinic-me-design-studio'], queryFn: () => clinicsApi.getCurrent().then(r => r.data) });

  const [themeColor, setThemeColor] = useState('#475569');
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    const tpl = clinic?.financialStatementTemplate || {};
    setThemeColor(tpl.themeColor || '#475569');
    setShowLogo(tpl.showLogo === true);
  }, [clinic]);

  const saveMutation = useMutation({
    mutationFn: () => clinicsApi.update({
      financialStatementTemplate: { ...(clinic?.financialStatementTemplate || {}), themeColor, showLogo },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-me-design-studio'] });
      toast.success('Balance sheet branding saved');
    },
    onError: () => toast.error('Failed to save balance sheet branding'),
  });

  if (isLoading) return <CenteredSpinner />;

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-4 text-sm"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        The Finance module (chart of accounts, journal, balance sheet, P&amp;L, cash flow) hasn't
        been built yet. Branding set here is saved now and will apply automatically to financial
        statements once that module ships — a live preview isn't possible until then.
      </div>
      <ThemeColorPicker value={themeColor} onChange={setThemeColor} />
      <div className="rounded-xl px-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-4 pb-1">Display Options</p>
        <ToggleRow label="Show clinic logo" checked={showLogo} onChange={setShowLogo} />
        <div className="pb-1" />
      </div>
      <SaveBar mutation={saveMutation} />
    </div>
  );
}

// ─── Shared bits ───────────────────────────────────────────────────────────
function CenteredSpinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 size={22} className="animate-spin text-[var(--text-muted)]" />
    </div>
  );
}

function NotesFields({
  headerNote, setHeaderNote, footerNote, setFooterNote,
}: { headerNote: string; setHeaderNote: (v: string) => void; footerNote: string; setFooterNote: (v: string) => void }) {
  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5">
        <FileText size={13} className="text-[var(--text-muted)]" />
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Custom Notes (optional)</p>
      </div>
      <div>
        <label className="label text-xs mb-1 block">Header note</label>
        <textarea value={headerNote} onChange={e => setHeaderNote(e.target.value)} className="input w-full resize-none text-sm" rows={2} />
      </div>
      <div>
        <label className="label text-xs mb-1 block">Footer note</label>
        <textarea value={footerNote} onChange={e => setFooterNote(e.target.value)} className="input w-full resize-none text-sm" rows={2} />
      </div>
    </div>
  );
}

function SaveBar({ mutation }: { mutation: { mutate: () => void; isPending: boolean } }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="btn-primary flex items-center gap-2 px-5"
      >
        {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save template
      </button>
    </div>
  );
}

// ─── Design Studio shell ───────────────────────────────────────────────────
// Phase 8 — one shared editor for all four document types, replacing the
// separate BillingTemplateTab / PrescriptionTemplateTab. Each panel still
// reads/writes its own clinic.*Template JSON column through the existing
// per-domain template endpoints — no new template storage was introduced.
export default function DesignStudio() {
  const [docType, setDocType] = useState<DocType>('invoice');
  const active = DOC_TYPES.find(d => d.id === docType)!;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">Design Studio</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Customize how your clinic's printed documents look. Pick a document type, then edit its
          branding — the preview below always matches what actually prints.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DOC_TYPES.map(d => {
          const Icon = d.icon;
          const isActive = d.id === docType;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setDocType(d.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'text-brand-400 bg-brand-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
              }`}
              style={{ border: `1px solid ${isActive ? 'var(--brand-500, #027cc6)' : 'var(--border)'}` }}
            >
              <Icon size={14} />
              {d.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--text-muted)] -mt-3">{active.blurb}</p>

      {docType === 'invoice' && <InvoicePanel />}
      {docType === 'prescription' && <PrescriptionPanel />}
      {docType === 'lab-report' && <LabReportPanel />}
      {docType === 'balance-sheet' && <BalanceSheetPanel />}
    </div>
  );
}
