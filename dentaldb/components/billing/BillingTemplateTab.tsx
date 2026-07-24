'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Palette, FileText, Eye, EyeOff, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { billingTemplateApi, BASE_URL } from '@/lib/api';

const API_BASE = BASE_URL; // Electron-aware, from lib/api.ts

const PRESET_COLORS = [
  { label: 'Brand Blue',   value: '#027cc6' },
  { label: 'Slate',        value: '#475569' },
  { label: 'Emerald',      value: '#059669' },
  { label: 'Violet',       value: '#7c3aed' },
  { label: 'Rose',         value: '#e11d48' },
  { label: 'Amber',        value: '#d97706' },
  { label: 'Teal',         value: '#0d9488' },
  { label: 'Indigo',       value: '#4338ca' },
];

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

export default function BillingTemplateTab() {
  const qc = useQueryClient();

  const { data: tpl, isLoading } = useQuery({
    queryKey: ['billing-template'],
    queryFn:  () => billingTemplateApi.get().then(r => r.data),
  });

  const [themeColor,       setThemeColor]       = useState('#027cc6');
  const [customColor,      setCustomColor]       = useState('#027cc6');
  const [showLogo,             setShowLogo]             = useState(false);
  const [showLicenseNumber,    setShowLicenseNumber]    = useState(false);
  const [showVatNumber,        setShowVatNumber]        = useState(false);
  const [showRegistrationNumber, setShowRegistrationNumber] = useState(false);
  const [headerNote,       setHeaderNote]        = useState('');
  const [footerNote,       setFooterNote]        = useState('');
  const [showPreview,      setShowPreview]        = useState(false);
  const [previewKey,       setPreviewKey]         = useState(0);

  useEffect(() => {
    if (!tpl) return;
    setThemeColor(tpl.themeColor   || '#027cc6');
    setCustomColor(tpl.themeColor  || '#027cc6');
    setShowLogo(tpl.showLogo                   === true);
    setShowLicenseNumber(tpl.showLicenseNumber === true);
    setShowVatNumber(tpl.showVatNumber         === true);
    setShowRegistrationNumber(tpl.showRegistrationNumber === true);
    setHeaderNote(tpl.headerNote   || '');
    setFooterNote(tpl.footerNote   || '');
  }, [tpl]);

  const saveMutation = useMutation({
    mutationFn: () => billingTemplateApi.update({
      themeColor,
      showLogo,
      showLicenseNumber,
      showVatNumber,
      showRegistrationNumber,
      headerNote: headerNote || null,
      footerNote: footerNote || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-template'] });
      setPreviewKey(k => k + 1); // refresh iframe
      toast.success('Billing template saved');
    },
    onError: () => toast.error('Failed to save billing template'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={22} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Billing Template</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Customize how generated invoices look. Changes apply to all future downloads.
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

      {/* Theme Color */}
      <div
        className="rounded-xl p-4 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5">
          <Palette size={13} className="text-[var(--text-muted)]" />
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Brand Color</p>
        </div>

        {/* Preset swatches */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => { setThemeColor(c.value); setCustomColor(c.value); }}
              className="w-8 h-8 rounded-lg transition-transform hover:scale-110 shadow-md"
              style={{
                background: c.value,
                outline: themeColor === c.value ? `3px solid ${c.value}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>

        {/* Custom color picker */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg shadow-md shrink-0 border border-white/10"
            style={{ background: themeColor }}
          />
          <div className="flex-1">
            <label className="text-xs text-[var(--text-muted)] block mb-1">Custom hex color</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customColor}
                onChange={e => setCustomColor(e.target.value)}
                onBlur={() => {
                  const hex = customColor.trim();
                  if (/^#[0-9a-fA-F]{6}$/.test(hex)) setThemeColor(hex);
                  else toast.error('Enter a valid hex color (e.g. #027cc6)');
                }}
                placeholder="#027cc6"
                className="input flex-1 font-mono text-sm"
                maxLength={7}
              />
              <input
                type="color"
                value={themeColor}
                onChange={e => { setThemeColor(e.target.value); setCustomColor(e.target.value); }}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                style={{ background: 'var(--bg-elevated)' }}
              />
            </div>
          </div>
        </div>

        {/* Live swatch */}
        <div
          className="rounded-lg p-3 text-white text-sm font-semibold flex items-center justify-between"
          style={{ background: themeColor }}
        >
          <span>Sample Invoice Header</span>
          <span className="text-xs opacity-80">INV-2024-001</span>
        </div>
      </div>

      {/* Toggles */}
      <div
        className="rounded-xl px-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-4 pb-1">Display Options</p>
        <p className="text-[10px] text-[var(--text-muted)] pb-2">These fields are pulled from your Clinic Profile settings. Toggle to show/hide on invoices, then click Save.</p>
        <ToggleRow
          label="Show clinic logo"
          description="Prints clinic logo in invoice header"
          checked={showLogo}
          onChange={setShowLogo}
        />
        <ToggleRow
          label="Show license number"
          description="Prints clinic license number under the clinic name"
          checked={showLicenseNumber}
          onChange={setShowLicenseNumber}
        />
        <ToggleRow
          label="Show registration number"
          description="Prints clinic registration number under the clinic name"
          checked={showRegistrationNumber}
          onChange={setShowRegistrationNumber}
        />
        <ToggleRow
          label="Show VAT number"
          description="Prints clinic VAT number under the clinic name and in the footer"
          checked={showVatNumber}
          onChange={setShowVatNumber}
        />
        <div className="pb-1" />
      </div>

      {/* Notes */}
      <div
        className="rounded-xl p-4 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5">
          <FileText size={13} className="text-[var(--text-muted)]" />
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Custom Notes (optional)</p>
        </div>
        <div>
          <label className="label text-xs mb-1 block">Header note</label>
          <textarea
            value={headerNote}
            onChange={e => setHeaderNote(e.target.value)}
            className="input w-full resize-none text-sm"
            rows={2}
            placeholder="e.g. Thank you for choosing our clinic. All prices are inclusive of taxes."
          />
        </div>
        <div>
          <label className="label text-xs mb-1 block">Footer note</label>
          <textarea
            value={footerNote}
            onChange={e => setFooterNote(e.target.value)}
            className="input w-full resize-none text-sm"
            rows={2}
            placeholder="e.g. Payment is due within 30 days. Contact us at billing@clinic.com"
          />
        </div>
      </div>

      {/* Live preview */}
      {showPreview && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
          >
            <p className="text-xs font-medium text-[var(--text-muted)]">Invoice preview (sample data)</p>
            <button
              type="button"
              onClick={() => setPreviewKey(k => k + 1)}
              className="btn-ghost text-xs flex items-center gap-1 px-2 py-1"
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
          <iframe
            key={previewKey}
            src={`${API_BASE}/api/v1/billing/template/preview`}
            className="w-full border-none"
            style={{ height: 520, background: '#f3f4f6' }}
            title="Billing template preview"
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