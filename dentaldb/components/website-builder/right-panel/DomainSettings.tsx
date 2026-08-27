'use client';

import React, { useState, useEffect } from 'react';
import { websiteApi } from '@/lib/api/websiteApi';
import toast from 'react-hot-toast';
import { tokens } from './design-tokens';

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoCheck  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoSpin   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'builder-spin .7s linear infinite', display: 'block' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const IcoSave   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IcoGlobe  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IcoCopy   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IcoInfo   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IcoExtLink = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;

// ── Config ─────────────────────────────────────────────────────────────────────
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'clinickarobar.com';
const API_IP      = process.env.NEXT_PUBLIC_API_IP      || ''; // e.g. '213.199.49.9' — set in .env

// ── Design tokens ─────────────────────────────────────────────────────────────
const sectionCard: React.CSSProperties = {
  background: tokens.surface, borderRadius: 12, border: `1px solid ${tokens.border}`, padding: 14,
};
const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: tokens.label,
  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
  display: 'flex', alignItems: 'center', gap: 6,
};
const inputSt: React.CSSProperties = {
  width: '100%', fontSize: 13, color: tokens.text,
  border: `1.5px solid ${tokens.border}`, borderRadius: 8,
  padding: '8px 11px', outline: 'none', fontFamily: tokens.font,
  boxSizing: 'border-box', transition: 'border-color .15s',
  background: tokens.surfaceDeep,
};
const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: tokens.accent, color: '#fff',
  fontSize: 12, fontWeight: 600, fontFamily: tokens.font,
  transition: 'opacity .15s', width: '100%',
};
const btnGhost: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'transparent', color: tokens.text,
  border: `1.5px solid ${tokens.border}`,
  fontSize: 12, fontWeight: 600, fontFamily: tokens.font,
  transition: 'all .15s', flex: 1,
};
const monoBox: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 7, padding: '7px 10px',
  fontSize: 11, fontFamily: tokens.fontMono,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export function DomainSettings({ clinicId }: { clinicId: string }) {
  const [subdomain,    setSubdomain]    = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [verifying,    setVerifying]    = useState(false);
  const [verified,     setVerified]     = useState<boolean | null>(null);
  const [verifyMsg,    setVerifyMsg]    = useState('');
  const [savingSub,    setSavingSub]    = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    websiteApi.get()
      .then((data: any) => {
        setSubdomain(data.subdomain      || '');
        setCustomDomain(data.customDomain || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSubdomain = async () => {
    const slug = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) return;
    setSavingSub(true);
    try {
      await websiteApi.update({ subdomain: slug });
      setSubdomain(slug);
      toast.success('Subdomain saved!');
    } catch (err: any) {
      toast.error('Failed to save: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    } finally {
      setSavingSub(false);
    }
  };

  const handleSaveDomain = async () => {
    const domain = customDomain.trim().toLowerCase();
    if (!domain) return;
    setSavingDomain(true);
    try {
      await websiteApi.update({ customDomain: domain });
      setVerified(null);
      toast.success('Custom domain saved! Now add the DNS records below.');
    } catch (err: any) {
      toast.error('Failed to save: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    } finally {
      setSavingDomain(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true); setVerified(null);
    try {
      const data = await websiteApi.verifyDomain();
      setVerified(data.verified);
      setVerifyMsg(data.message);
    } catch {
      setVerified(false);
      setVerifyMsg('Verification failed. Please try again in a few minutes.');
    }
    setVerifying(false);
  };

  const liveSubdomainUrl  = subdomain ? `https://${subdomain}.${ROOT_DOMAIN}` : null;
  const verifyTxtRecord   = `clinic-karobar-verify=${clinicId}`;

  // For custom domains, clinic needs to point their domain to our frontend IP.
  // If using Cloudflare on our end — they CNAME to our app domain.
  // Provide both options.
  const dnsRecords = customDomain
    ? [
        {
          type:    'TXT',
          name:    '@',
          value:   verifyTxtRecord,
          purpose: 'Domain ownership verification',
        },
        // Option A: CNAME (if their DNS supports CNAME flattening, e.g. Cloudflare)
        {
          type:    'CNAME',
          name:    customDomain.startsWith('www.') ? 'www' : '@',
          value:   `app.${ROOT_DOMAIN}`,
          purpose: 'Points domain to ClinicKarobar (use if your DNS supports CNAME at root)',
        },
        // Option B: A record (universal fallback)
        ...(API_IP
          ? [{
              type:    'A',
              name:    '@',
              value:   API_IP,
              purpose: 'Points domain to ClinicKarobar server (use if CNAME at root not supported)',
            }]
          : []),
      ]
    : [];

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20, fontFamily: tokens.font, background: tokens.bg, minHeight: '100%' }}>

      {/* ── Subdomain ── */}
      <div style={sectionCard}>
        <div style={sectionLabel}><IcoGlobe /> Free Subdomain</div>

        <div style={{ fontSize: 11, color: tokens.muted, marginBottom: 10, lineHeight: 1.6 }}>
          Your clinic will be accessible at{' '}
          <span style={{ color: tokens.text, fontFamily: tokens.fontMono }}>
            yourslug.{ROOT_DOMAIN}
          </span>
        </div>

        {/* Input row */}
        <div style={{
          display: 'flex', border: `1.5px solid ${tokens.border}`, borderRadius: 8,
          overflow: 'hidden', background: tokens.surfaceDeep, marginBottom: 10,
          opacity: loading ? 0.6 : 1,
        }}>
          <input
            value={subdomain}
            onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder={loading ? 'Loading…' : 'your-clinic'}
            disabled={loading}
            style={{
              flex: 1, padding: '8px 10px', fontSize: 13, border: 'none', outline: 'none',
              fontFamily: tokens.font, color: tokens.text, background: 'transparent',
            }}
          />
          <span style={{
            padding: '8px 10px', background: 'rgba(255,255,255,0.04)', color: tokens.muted,
            fontSize: 12, borderLeft: `1.5px solid ${tokens.border}`,
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
          }}>
            .{ROOT_DOMAIN}
          </span>
        </div>

        {/* Live URL preview */}
        {liveSubdomainUrl && !loading && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: tokens.muted, marginBottom: 4 }}>Your public URL:</div>
            <div style={{ ...monoBox }}>
              <span style={{ color: '#818cf8', wordBreak: 'break-all' }}>{liveSubdomainUrl}</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => copyToClipboard(liveSubdomainUrl)}
                  title="Copy URL"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.muted, padding: 0 }}
                >
                  <IcoCopy />
                </button>
                <a
                  href={liveSubdomainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open site"
                  style={{ color: tokens.muted, display: 'flex', alignItems: 'center' }}
                >
                  <IcoExtLink />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Preview link (builder preview, no publish needed) */}
        {subdomain && !loading && (
          <div style={{ marginBottom: 10, fontSize: 11, color: tokens.muted }}>
            Builder preview:{' '}
            <a
              href={`/site/${subdomain}/preview`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#818cf8', textDecoration: 'none' }}
            >
              /site/{subdomain}/preview ↗
            </a>
          </div>
        )}

        <button
          onClick={handleSaveSubdomain}
          disabled={savingSub || !subdomain || loading}
          style={{ ...btnPrimary, opacity: (!subdomain || savingSub || loading) ? 0.5 : 1 }}
        >
          {savingSub ? <IcoSpin /> : <IcoSave />}
          {savingSub ? 'Saving…' : 'Save Subdomain'}
        </button>
      </div>

      {/* ── Custom Domain ── */}
      <div style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={sectionLabel}><IcoGlobe /> Custom Domain</div>

        <div style={{ fontSize: 11, color: tokens.muted, lineHeight: 1.6 }}>
          Connect your own domain (e.g. <span style={{ color: tokens.text, fontFamily: tokens.fontMono }}>www.yourclinic.com</span>).
          Enter the domain, save, then add the DNS records below in your domain registrar.
        </div>

        <input
          value={customDomain}
          onChange={e => setCustomDomain(e.target.value.toLowerCase().trim())}
          placeholder="www.yourclinic.com or yourclinic.com"
          style={inputSt}
          onFocus={e  => (e.currentTarget.style.borderColor = tokens.borderFocus)}
          onBlur={e   => (e.currentTarget.style.borderColor = tokens.border)}
        />

        {/* DNS instructions — shown once a domain is entered */}
        {customDomain && (
          <div style={{
            background: 'rgba(234,179,8,0.07)',
            border: '1px solid rgba(234,179,8,0.25)',
            borderRadius: 10, padding: 12,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 8,
            }}>
              <IcoInfo /> Add these DNS records at your registrar
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dnsRecords.map((rec, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: '#a78040', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {rec.purpose}
                  </div>
                  <div style={{ ...monoBox }}>
                    <div>
                      <span style={{ color: '#fbbf24', fontWeight: 700 }}>{rec.type}</span>
                      {'  '}
                      <span style={{ color: '#94a3b8' }}>{rec.name}</span>
                      {'  →  '}
                      <span style={{ color: tokens.text, wordBreak: 'break-all' }}>{rec.value}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(rec.value)}
                      title="Copy value"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.muted, flexShrink: 0, padding: 0 }}
                    >
                      <IcoCopy />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 10, color: '#a78040', lineHeight: 1.7 }}>
              <strong>Note:</strong> DNS changes can take up to 48 hours to propagate.
              Use the <em>Verify</em> button after adding records. If your registrar is
              Cloudflare, set the CNAME proxy status to <strong>DNS only</strong> (grey cloud)
              until verification succeeds.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSaveDomain}
            disabled={savingDomain || !customDomain || loading}
            style={{ ...btnGhost, opacity: (!customDomain || savingDomain || loading) ? 0.5 : 1 }}
          >
            {savingDomain ? <IcoSpin /> : <IcoSave />}
            {savingDomain ? 'Saving…' : 'Save Domain'}
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying || !customDomain}
            style={{ ...btnPrimary, flex: 1, opacity: (verifying || !customDomain) ? 0.7 : 1 }}
          >
            {verifying ? <IcoSpin /> : <IcoCheck />}
            {verifying ? 'Verifying…' : 'Verify DNS'}
          </button>
        </div>

        {verified !== null && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5,
            background: verified ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
            border: `1px solid ${verified ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
            color: verified ? '#4ade80' : '#f87171',
          }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              {verified
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            </span>
            <span>{verifyMsg}</span>
          </div>
        )}

        {verified === true && customDomain && (
          <div style={{ fontSize: 11, color: tokens.muted }}>
            🎉 Your site is live at{' '}
            <a
              href={`https://${customDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#818cf8' }}
            >
              https://{customDomain} ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
