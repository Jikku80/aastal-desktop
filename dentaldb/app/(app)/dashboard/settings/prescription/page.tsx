'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, Check, Eye, Download, User, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── API helpers ───────────────────────────────────────────────────────────────

const token   = () => localStorage.getItem('token') || '';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const fetchClinicSettings = () =>
  fetch('/api/clinics/settings', { headers: headers() }).then(r => r.json());

const fetchMyProfile = () =>
  fetch('/api/users/me', { headers: headers() }).then(r => r.json());

const fetchPrescriptionTemplate = () =>
  fetch('/api/clinics/prescription-template', { headers: headers() }).then(r => r.json());

// ── Info Banner ───────────────────────────────────────────────────────────────

function InfoBanner({ icon: Icon, title, description, children }: {
  icon:        React.ElementType;
  title:       string;
  description: string;
  children?:   React.ReactNode;
}) {
  return (
    <div className="flex gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-blue-600" />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-blue-900 text-sm">{title}</div>
        <div className="text-xs text-blue-700 mt-0.5 leading-relaxed">{description}</div>
        {children}
      </div>
    </div>
  );
}

// ── Preview thumbnail ─────────────────────────────────────────────────────────

function ImagePreview({ src, label, fallback }: { src?: string; label: string; fallback: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
        {src ? (
          <img src={src} alt={label} className="max-h-20 max-w-full object-contain" />
        ) : (
          <div className="text-gray-300 flex flex-col items-center gap-1">
            {fallback}
            <span className="text-xs">Not set</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PrescriptionSettingsPage() {
  const [themeColor, setThemeColor] = useState('#0369a1');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const { data: clinic } = useQuery<{
    logo?: string;
    name?: string;
    address?: string;
    prescriptionTemplate?: {
      themeColor?: string;
      headerText?: string;
      footerText?: string;
    };
  }>({
    queryKey: ['clinic-settings'],
    queryFn:  fetchClinicSettings,
    onSuccess: (d) => {
      if (d?.prescriptionTemplate?.themeColor) setThemeColor(d.prescriptionTemplate.themeColor);
      if (d?.prescriptionTemplate?.headerText)  setHeaderText(d.prescriptionTemplate.headerText);
      if (d?.prescriptionTemplate?.footerText)  setFooterText(d.prescriptionTemplate.footerText);
    },
  } as any);

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn:  fetchMyProfile,
  });

  // URLs that will be auto-used
  const clinicLogo      = clinic?.logo;
  const doctorSignature = (profile as any)?.signature;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/clinics/prescription-template', {
        method:  'PATCH',
        headers: headers(),
        body:    JSON.stringify({ themeColor, headerText, footerText }),
      });
      if (!res.ok) throw new Error();
      toast.success('Prescription settings saved!');
    } catch {
      toast.error('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      // Open prescription preview in new tab
      window.open(`/api/prescriptions/preview-template?themeColor=${encodeURIComponent(themeColor)}&headerText=${encodeURIComponent(headerText)}&footerText=${encodeURIComponent(footerText)}`, '_blank');
    } catch {}
    setPreviewing(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Prescription Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Customize how your prescriptions look when printed or downloaded.
        </p>
      </div>

      <div className="space-y-6">

        {/* ── Auto-pulled: Logo from Clinic Settings ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-gray-600" />
              <h2 className="font-semibold text-gray-900">Clinic Logo</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <InfoBanner
              icon={Info}
              title="Logo is auto-pulled from Clinic Settings"
              description="The logo used on prescriptions is always taken directly from your Clinic Settings page. To change the logo, go to Settings → Clinic Profile and update the logo there."
            >
              <a
                href="/dashboard/settings/clinic"
                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                → Go to Clinic Settings
              </a>
            </InfoBanner>

            <ImagePreview
              src={clinicLogo}
              label="Current clinic logo (will appear on prescriptions)"
              fallback={<Building2 size={24} className="text-gray-300" />}
            />

            {clinicLogo && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <Check size={13} />
                Logo found — it will appear automatically on all prescriptions
              </div>
            )}
          </div>
        </div>

        {/* ── Auto-pulled: Signature from Doctor Profile ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-600" />
              <h2 className="font-semibold text-gray-900">Doctor Signature</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <InfoBanner
              icon={Info}
              title="Signature is auto-pulled from your Profile"
              description="When you print or download a prescription, your personal signature is automatically added from your profile page. Each doctor's prescriptions use their own individual signature — no manual selection needed."
            >
              <a
                href="/dashboard/profile"
                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                → Update my signature in Profile
              </a>
            </InfoBanner>

            <ImagePreview
              src={doctorSignature}
              label={`Current signature for: ${(profile as any)?.firstName || 'You'} ${(profile as any)?.lastName || ''}`}
              fallback={<User size={24} className="text-gray-300" />}
            />

            {doctorSignature ? (
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <Check size={13} />
                Signature found — it will appear automatically when you print/download a prescription
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <Info size={13} />
                No signature set — go to your Profile to upload one
              </div>
            )}
          </div>
        </div>

        {/* ── Customizable settings ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Design & Layout</h2>
          </div>
          <div className="p-6 space-y-5">

            {/* Theme color */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColor}
                  onChange={e => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={e => setThemeColor(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="#0369a1"
                />
                <div className="w-10 h-10 rounded-lg border border-gray-200 flex-shrink-0" style={{ background: themeColor }} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Used for headings, borders, and the Rx symbol on prescriptions.</p>
            </div>

            {/* Header text */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Custom Header Text <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={headerText}
                onChange={e => setHeaderText(e.target.value)}
                placeholder="e.g. Reg. No: NMC-12345 | MD (Cardiology), AIIMS Delhi"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">Shown below the clinic address in the header.</p>
            </div>

            {/* Footer text */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Custom Footer Text <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                placeholder="e.g. Follow up in 7 days. For emergencies, call: +977-1-XXXXXXX"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">Shown at the bottom of every prescription.</p>
            </div>
          </div>
        </div>

        {/* ── Live preview sample ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Preview</h2>
            <button
              onClick={handlePreview}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              <Eye size={13} /> Full Preview
            </button>
          </div>
          <div className="p-6">
            {/* Mini preview */}
            <div className="border border-gray-200 rounded-xl overflow-hidden text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
              {/* Header */}
              <div className="flex items-start justify-between p-4" style={{ borderBottom: `3px solid ${themeColor}` }}>
                <div>
                  {clinicLogo ? (
                    <img src={clinicLogo} alt="logo" className="h-8 object-contain mb-1" />
                  ) : (
                    <div className="font-bold text-base" style={{ color: themeColor }}>
                      {clinic?.name || 'Clinic Name'}
                    </div>
                  )}
                  <div className="text-gray-500 text-[10px] leading-tight mt-1">
                    {clinic?.address || '123 Medical St, City'}
                    {headerText && <div className="mt-0.5">{headerText}</div>}
                  </div>
                </div>
                <div className="text-4xl font-black leading-none" style={{ color: themeColor }}>℞</div>
              </div>
              {/* Body mock */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded p-2"><div className="text-[9px] text-gray-400">Patient</div><div className="font-semibold">John Doe</div></div>
                  <div className="bg-gray-50 rounded p-2"><div className="text-[9px] text-gray-400">Date</div><div className="font-semibold">{new Date().toLocaleDateString()}</div></div>
                </div>
                <table className="w-full border-collapse">
                  <thead><tr style={{ background: themeColor }}><th className="text-white text-left px-2 py-1 text-[9px]">Medicine</th><th className="text-white text-left px-2 py-1 text-[9px]">Dosage</th><th className="text-white text-left px-2 py-1 text-[9px]">Freq.</th></tr></thead>
                  <tbody><tr><td className="px-2 py-1 border-b border-gray-100 font-medium">Amoxicillin 500mg</td><td className="px-2 py-1 border-b border-gray-100">1 tab</td><td className="px-2 py-1 border-b border-gray-100">TDS × 5 days</td></tr></tbody>
                </table>
                {/* Signature */}
                <div className="flex flex-col items-end mt-4">
                  {doctorSignature ? (
                    <img src={doctorSignature} alt="sig" className="h-8 object-contain mb-1" />
                  ) : (
                    <div className="w-24 border-b border-gray-400 mb-1" />
                  )}
                  <div className="font-bold text-[10px]">Dr. {(profile as any)?.firstName || 'Your'} {(profile as any)?.lastName || 'Name'}</div>
                  <div className="text-gray-500 text-[9px]">{(profile as any)?.specialization || 'Physician'}</div>
                </div>
                {footerText && (
                  <div className="border-t border-gray-200 pt-2 text-[9px] text-gray-500">{footerText}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye size={15} />
            Full Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <><Check size={15} /> Save Settings</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
