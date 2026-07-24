'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Eye, EyeOff, Save, PenLine, RefreshCw, ExternalLink, ImagePlus, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { prescriptionsApi, clinicsApi, usersApi, BASE_URL } from '@/lib/api';

const API_BASE = BASE_URL; // Electron-aware, from lib/api.ts

// ── Toggle row ──────────────────────────────────────────────────────────────────
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
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

// ── Image info row (read-only, links to source) ───────────────────────────────
function ImageInfoRow({
  label, description, imageUrl, linkLabel, linkHref,
}: {
  label: string;
  description: string;
  imageUrl?: string | null;
  linkLabel: string;
  linkHref: string;
}) {
  const fullUrl = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`)
    : null;

  return (
    <div className="flex items-start gap-4">
      <div
        className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
      >
        {fullUrl
          ? <img src={fullUrl} alt={label} className="w-full h-full object-contain p-1" />
          : <ImagePlus size={22} className="text-[var(--text-muted)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mb-2 leading-relaxed">{description}</p>
        {!fullUrl && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 italic">Not set yet</p>
        )}
        <a
          href={linkHref}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          <ExternalLink size={11} />
          {linkLabel}
        </a>
      </div>
    </div>
  );
}

// ── Doctor selector ────────────────────────────────────────────────────────────
function DoctorSignaturePreview({ doctors }: { doctors: any[] }) {
  const [selectedId, setSelectedId] = useState<string>('');
  const doctor = doctors.find(d => d.id === selectedId);
  const sigUrl = doctor?.signatureUrl
    ? (doctor.signatureUrl.startsWith('http') ? doctor.signatureUrl : `${API_BASE}${doctor.signatureUrl}`)
    : null;

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-[var(--text-muted)] block mb-1.5">Preview a doctor's signature</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          <option value="">— Select doctor —</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id}>
              Dr. {d.firstName} {d.lastName}{d.signatureUrl ? '' : ' (no signature)'}
            </option>
          ))}
        </select>
      </div>

      {selectedId && (
        <div className="flex items-start gap-4 p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border)]">
          <div className="w-24 h-16 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-white border border-[var(--border)]">
            {sigUrl
              ? <img src={sigUrl} alt="Signature" className="w-full h-full object-contain p-1" />
              : <User size={20} className="text-[var(--text-muted)]" />}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Dr. {doctor?.firstName} {doctor?.lastName}
            </p>
            {sigUrl
              ? <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">✓ Signature on file</p>
              : (
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">No signature uploaded yet</p>
                  <a
                    href="/dashboard/settings?tab=staff"
                    className="inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:underline mt-1"
                  >
                    <ExternalLink size={10} /> Upload in Staff profile
                  </a>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main tab ────────────────────────────────────────────────────────────────────
export default function PrescriptionTemplateTab() {
  const qc = useQueryClient();

  const { data: tplData, isLoading } = useQuery({
    queryKey: ['prescription-template'],
    queryFn: () => prescriptionsApi.getTemplate().then(r => r.data),
  });

  // Fetch clinic info to show logo
  const { data: clinicData } = useQuery({
    queryKey: ['clinic-me'],
    queryFn: () => clinicsApi.getCurrent().then(r => r.data),
  });

  // Fetch doctors to show their signatures
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => usersApi.listStaff({ roles: 'doctor,dentist' }).then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    }),
  });
  const doctors = (staffData ?? []).filter((u: any) => u.role === 'dentist' || u.role === 'owner');

  const [headerHtml,        setHeaderHtml]        = useState('');
  const [footerHtml,        setFooterHtml]        = useState('');
  const [showLogo,          setShowLogo]          = useState(true);
  const [showLicenseNumber, setShowLicenseNumber] = useState(true);
  const [showDoctorName,    setShowDoctorName]    = useState(true);
  const [showPatientAge,    setShowPatientAge]    = useState(true);
  const [showPatientGender, setShowPatientGender] = useState(true);
  const [showPreview,       setShowPreview]       = useState(false);

  /* Sync state when template loads */
  useEffect(() => {
    if (!tplData) return;
    setHeaderHtml(tplData.headerHtml || '');
    setFooterHtml(tplData.footerHtml || '');
    setShowLogo(tplData.showLogo ?? true);
    setShowLicenseNumber(tplData.showLicenseNumber ?? true);
    setShowDoctorName(tplData.showDoctorName ?? true);
    setShowPatientAge(tplData.showPatientAge ?? true);
    setShowPatientGender(tplData.showPatientGender ?? true);
  }, [tplData]);

  const saveMutation = useMutation({
    mutationFn: () => prescriptionsApi.updateTemplate({
      headerHtml:        headerHtml || null,
      footerHtml:        footerHtml || null,
      showLogo,
      showLicenseNumber,
      showDoctorName,
      showPatientAge,
      showPatientGender,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescription-template'] });
      toast.success('Template saved');
    },
    onError: () => toast.error('Failed to save template'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={22} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const clinicLogoUrl = (clinicData as any)?.logo ?? null;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Prescription Template</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Customize how printed prescriptions look. Changes apply to all new prints.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5"
        >
          {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
          {showPreview ? 'Hide preview' : 'Live preview'}
        </button>
      </div>

      {/* Images — sourced from clinic/doctor settings */}
      <div
        className="rounded-xl p-4 space-y-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Images</p>
          <span className="text-[10px] text-[var(--text-muted)] italic">Managed in their respective settings</span>
        </div>

        {/* Clinic Logo */}
        <ImageInfoRow
          label="Clinic Logo"
          description="Used at the top of every prescription. Upload or change the logo in Clinic Settings."
          imageUrl={clinicLogoUrl}
          linkLabel="Go to Clinic Settings"
          linkHref="/dashboard/settings?tab=clinic"
        />

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 4 }} />

        {/* Doctor Signature */}
        <div>
          <div className="flex items-start gap-4 mb-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5">Doctor Signature</p>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Each doctor's signature is automatically used from their staff profile. The signature of the prescribing doctor appears on that doctor's prescriptions.
              </p>
              <a
                href="/dashboard/settings?tab=staff"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 mt-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                <ExternalLink size={11} />
                Manage signatures in Staff settings
              </a>
            </div>
          </div>

          {doctors.length > 0 && (
            <DoctorSignaturePreview doctors={doctors} />
          )}
        </div>
      </div>

      {/* Toggles */}
      <div
        className="rounded-xl px-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-4 pb-1">Display Options</p>
        <ToggleRow label="Show clinic logo"         checked={showLogo}          onChange={setShowLogo} />
        <ToggleRow label="Show license number"      description="Prints clinic license # in letterhead" checked={showLicenseNumber} onChange={setShowLicenseNumber} />
        <ToggleRow label="Show doctor name"         checked={showDoctorName}    onChange={setShowDoctorName} />
        <ToggleRow label="Show patient age"         checked={showPatientAge}    onChange={setShowPatientAge} />
        <ToggleRow label="Show patient gender"      checked={showPatientGender} onChange={setShowPatientGender} />
        <div className="pb-1" />
      </div>

      {/* Custom HTML */}
      <div
        className="rounded-xl p-4 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5">
          <PenLine size={13} className="text-[var(--text-muted)]" />
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Custom HTML (optional)</p>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Leave blank to use the auto-generated letterhead. Custom HTML overrides the default header/footer completely.
        </p>
        <div>
          <label className="label text-xs mb-1 block">Header HTML (letterhead)</label>
          <textarea
            value={headerHtml}
            onChange={e => setHeaderHtml(e.target.value)}
            className="input w-full font-mono text-xs resize-y"
            rows={5}
            placeholder={'<div style="text-align:center">\n  <h1>My Clinic</h1>\n  <p>123 Main St | +977-1-...</p>\n</div>'}
          />
        </div>
        <div>
          <label className="label text-xs mb-1 block">Footer HTML (signature block)</label>
          <textarea
            value={footerHtml}
            onChange={e => setFooterHtml(e.target.value)}
            className="input w-full font-mono text-xs resize-y"
            rows={4}
            placeholder={'<div style="text-align:right">\n  <p>Dr. Jane Smith, BDS</p>\n</div>'}
          />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          💡 Tip: Leave the footer blank to auto-use the prescribing doctor's uploaded signature from their profile.
        </p>
      </div>

      {/* Live preview iframe */}
      {showPreview && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
          >
            <p className="text-xs font-medium text-[var(--text-muted)]">Template preview (sample data)</p>
            <button
              type="button"
              onClick={() => {
                const iframe = document.getElementById('rx-preview-iframe') as HTMLIFrameElement;
                if (iframe) { const src = iframe.src; iframe.src = ''; iframe.src = src; }
              }}
              className="btn-ghost text-xs flex items-center gap-1 px-2 py-1"
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
          <iframe
            id="rx-preview-iframe"
            src={`${API_BASE}/api/v1/prescriptions/template/preview-html`}
            className="w-full border-none"
            style={{ height: 500, background: '#f3f4f6' }}
            title="Template preview"
          />
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="btn-primary flex items-center gap-2 px-5"
        >
          {saveMutation.isPending
            ? <Loader2 size={14} className="animate-spin" />
            : <Save size={14} />}
          Save template
        </button>
      </div>
    </div>
  );
}
