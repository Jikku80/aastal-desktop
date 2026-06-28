'use client';

/**
 * components/seo/SeoDashboard.tsx
 * Fixed: dark mode, no emojis, mobile responsive, visible input text
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api, blogApi, seoApi } from '../../lib/api';
import { websiteApi } from '../../lib/api/websiteApi';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SeoConfig {
  title?:                  string;
  description?:            string;
  keywords?:               string[];
  ogImage?:                string;
  googleAnalyticsId?:      string;
  googleTagManagerId?:     string;
  facebookPixelId?:        string;
  googleSiteVerification?: string;
  bingSiteVerification?:   string;
  yandexVerification?:     string;
  city?:                   string;
  country?:                string;
  latitude?:               number | string;
  longitude?:              number | string;
  clinicType?:             string;
  aggregateRating?: { ratingValue?: number | string; reviewCount?: number | string };
  noindex?:                boolean;
  canonicalDomain?:        string;
}

interface HealthReport {
  score:    number;
  issues:   string[];
  warnings: string[];
  passed:   string[];
}

interface Redirect {
  id:         string;
  fromPath:   string;
  toPath:     string;
  statusCode: 301 | 302;
  isActive:   boolean;
  createdAt:  string;
}

interface SiteInfo { subdomain?: string; customDomain?: string; seo?: SeoConfig }

type Tab = 'health' | 'meta' | 'analytics' | 'local' | 'redirects' | 'blog' | 'schema';
const TABS: { id: Tab; label: string }[] = [
  { id: 'health',    label: 'Health'    },
  { id: 'meta',      label: 'Meta'      },
  { id: 'analytics', label: 'Analytics' },
  { id: 'local',     label: 'Local'     },
  { id: 'redirects', label: 'Redirects' },
  { id: 'blog',      label: 'Blog'      },
  { id: 'schema',    label: 'Schema'    },
];

// ── Input classes ─────────────────────────────────────────────────────────────
const inputCls = (over?: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm
   bg-white dark:bg-gray-800
   text-gray-900 dark:text-gray-100
   placeholder-gray-400 dark:placeholder-gray-500
   focus:outline-none focus:ring-2 focus:ring-blue-500
   ${over
     ? 'border-red-400'
     : 'border-gray-300 dark:border-gray-600'}`;

// ── Main component ─────────────────────────────────────────────────────────────

export function SeoDashboard() {
  const [activeTab,  setActiveTab]  = useState<Tab>('health');
  const [site,       setSite]       = useState<SiteInfo | null>(null);
  const [health,     setHealth]     = useState<HealthReport | null>(null);
  const [seoForm,    setSeoForm]    = useState<SeoConfig>({});
  const [redirects,  setRedirects]  = useState<Redirect[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [siteRes, healthRes, rediRes] = await Promise.all([
        websiteApi.get(),
        blogApi.seoHealth(),
        seoApi.listRedirects(),
      ]);
      const siteData   = siteRes;
      const healthData = healthRes.data ?? healthRes;
      const rediData   = rediRes.data ?? rediRes;
      setSite(siteData);
      setSeoForm(siteData?.seo ?? {});
      setHealth(healthData);
      setRedirects(Array.isArray(rediData) ? rediData : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSeo = async () => {
    setSaving(true);
    setError('');
    try {
      await websiteApi.update({ seo: seoForm });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      const h = await blogApi.seoHealth();
      setHealth(h.data ?? h);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof SeoConfig, val: any) =>
    setSeoForm(prev => ({ ...prev, [key]: val }));

  const sitemapUrl = site?.customDomain
    ? `https://${site.customDomain}/sitemap.xml`
    : site?.subdomain
      ? `https://${site.subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'clinickarobar.com'}/sitemap.xml`
      : '';

  const robotsUrl = sitemapUrl.replace('sitemap.xml', 'robots.txt');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
        Loading SEO dashboard…
      </div>
    );
  }

  const isEditableTab = ['meta', 'analytics', 'local'].includes(activeTab);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">SEO Management</h2>
        {health && <ScoreBadge score={health.score} />}
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="flex overflow-x-auto gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Health ──────────────────────────────────────────────────────────── */}
      {activeTab === 'health' && health && (
        <div className="space-y-4">
          {health.issues.length > 0 && (
            <IssueBlock color="red"    title={`Critical Issues (${health.issues.length})`}   items={health.issues} />
          )}
          {health.warnings.length > 0 && (
            <IssueBlock color="yellow" title={`Warnings (${health.warnings.length})`}         items={health.warnings} />
          )}
          {health.passed.length > 0 && (
            <IssueBlock color="green"  title={`Passed (${health.passed.length})`}             items={health.passed} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {sitemapUrl && (
              <a href={sitemapUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                View Sitemap
              </a>
            )}
            {robotsUrl && (
              <a href={robotsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                View robots.txt
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Meta ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'meta' && (
        <div className="space-y-4">
          <Field label="Site Title"          hint="60 chars max — shown in Google results"
            value={seoForm.title ?? ''} onChange={v => update('title', v)} maxLength={60} />
          <Field label="Meta Description"    hint="150–160 chars — shown in Google snippets"
            value={seoForm.description ?? ''} onChange={v => update('description', v)} multiline maxLength={160} />
          <Field label="Keywords"            hint="Comma-separated"
            value={(seoForm.keywords ?? []).join(', ')}
            onChange={v => update('keywords', v.split(',').map((k: string) => k.trim()).filter(Boolean))} />
          <Field label="Open Graph Image URL" hint="1200×630px recommended"
            value={seoForm.ogImage ?? ''} onChange={v => update('ogImage', v)} />
          <Field label="Canonical Domain Override" hint='Only set if you have a custom domain. e.g. www.myclinic.com — no https://'
            value={seoForm.canonicalDomain ?? ''} onChange={v => update('canonicalDomain', v)} />
          <Toggle
            label="Noindex this website"
            hint="Prevents all search engines from indexing this site"
            checked={!!seoForm.noindex}
            onChange={v => update('noindex', v)}
          />
        </div>
      )}

      {/* ── Analytics ────────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
            Connect analytics tools to track visitors and verify Search Console ownership.
          </div>
          <Field label="Google Analytics ID"             hint="Format: G-XXXXXXXXXX"
            value={seoForm.googleAnalyticsId ?? ''}      onChange={v => update('googleAnalyticsId', v)} />
          <Field label="Google Tag Manager ID"           hint="Format: GTM-XXXXXXX"
            value={seoForm.googleTagManagerId ?? ''}     onChange={v => update('googleTagManagerId', v)} />
          <Field label="Facebook Pixel ID"
            value={seoForm.facebookPixelId ?? ''}        onChange={v => update('facebookPixelId', v)} />

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Search Console Verification
            </p>
            <Field label="Google Verification Code"    hint="HTML meta tag content= value from Search Console"
              value={seoForm.googleSiteVerification ?? ''} onChange={v => update('googleSiteVerification', v)} />
            <div className="mt-3">
              <Field label="Bing Webmaster Verification" hint="msvalidate.01 content value"
                value={seoForm.bingSiteVerification ?? ''} onChange={v => update('bingSiteVerification', v)} />
            </div>
            <div className="mt-3">
              <Field label="Yandex Verification"
                value={seoForm.yandexVerification ?? ''} onChange={v => update('yandexVerification', v)} />
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
            <p className="font-semibold text-gray-800 dark:text-gray-200">Search Console Setup Guide</p>
            <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
              <li>Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">search.google.com/search-console</a></li>
              <li>Add property using <strong>URL prefix</strong> method</li>
              <li>Choose <strong>HTML tag</strong> verification → copy the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">content=</code> value</li>
              <li>Paste it in the Google Verification Code field above and Save</li>
              <li>Return to Search Console and click <strong>Verify</strong></li>
              <li>Submit sitemap: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{sitemapUrl || 'https://yourdomain.com/sitemap.xml'}</code></li>
            </ol>
          </div>
        </div>
      )}

      {/* ── Local SEO ─────────────────────────────────────────────────────────── */}
      {activeTab === 'local' && (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl p-3 text-sm text-green-800 dark:text-green-300">
            Local SEO helps patients near you find your clinic on Google Maps and local searches.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="City / Locality" hint="e.g. Kathmandu"
              value={seoForm.city ?? ''} onChange={v => update('city', v)} />
            <Field label="Country Code" hint="ISO 2-letter, e.g. NP"
              value={seoForm.country ?? 'NP'} onChange={v => update('country', v)} />
            <Field label="Latitude"  hint="e.g. 27.7172"
              value={String(seoForm.latitude ?? '')} onChange={v => update('latitude', v)} />
            <Field label="Longitude" hint="e.g. 85.3240"
              value={String(seoForm.longitude ?? '')} onChange={v => update('longitude', v)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Clinic Schema Type
            </label>
            <select
              value={seoForm.clinicType ?? 'MedicalClinic'}
              onChange={e => update('clinicType', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {['MedicalClinic', 'Dentist', 'Optician', 'Pharmacy', 'Physiotherapist'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aggregate Rating (Schema.org)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Rating Value (1–5)"
                value={String(seoForm.aggregateRating?.ratingValue ?? '')}
                onChange={v => update('aggregateRating', { ...seoForm.aggregateRating, ratingValue: parseFloat(v) || undefined })} />
              <Field label="Review Count"
                value={String(seoForm.aggregateRating?.reviewCount ?? '')}
                onChange={v => update('aggregateRating', { ...seoForm.aggregateRating, reviewCount: parseInt(v, 10) || undefined })} />
            </div>
          </div>
        </div>
      )}

      {/* ── Redirects ─────────────────────────────────────────────────────────── */}
      {activeTab === 'redirects' && (
        <RedirectsTab
          redirects={redirects}
          onAdd={async (from, to, code) => {
            await seoApi.createRedirect({ fromPath: from, toPath: to, statusCode: code });
            const res = await seoApi.listRedirects();
            const updated = res.data ?? res;
            setRedirects(Array.isArray(updated) ? updated : []);
          }}
          onRemove={async (id) => {
            await seoApi.deleteRedirect(id);
            setRedirects(prev => prev.filter(r => r.id !== id));
          }}
        />
      )}

      {/* ── Blog ──────────────────────────────────────────────────────────────── */}
      {activeTab === 'blog' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Blog posts are the fastest way to grow organic search traffic. Target local keywords
            in every title and include a FAQ section for bonus schema markup.
          </p>
          <a
            href="/dashboard/seo"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Manage Blog Posts
          </a>
          <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400">
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">SEO Blog Checklist</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>Include clinic name + city in the post title</li>
              <li>Write 500–1500 words targeting a specific keyword</li>
              <li>Add a FAQ section (auto-generates FAQPage schema)</li>
              <li>Set featured image for Open Graph sharing</li>
              <li>Fill in Meta Title &amp; Meta Description (160 chars max)</li>
              <li>Assign categories and tags for category pages</li>
              <li>Use the Internal Links tab to link related posts</li>
              <li>Publish at least 1 post per month</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Schema preview ───────────────────────────────────────────────────── */}
      {activeTab === 'schema' && (
        <SchemaPreviewTab subdomain={site?.subdomain ?? ''} />
      )}

      {/* ── Save button (editable tabs only) ─────────────────────────────────── */}
      {isEditableTab && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-gray-700 pt-5">
          <button
            onClick={saveSeo}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Save SEO Settings'}
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">Saved!</span>}
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80
    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
    : score >= 50
      ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
      : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold ${cls}`}>
      SEO Score {score}/100
    </span>
  );
}

function IssueBlock({
  color, title, items,
}: {
  color: 'red' | 'yellow' | 'green';
  title: string;
  items: string[];
}) {
  const cls: Record<typeof color, string> = {
    red:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300',
    green:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300',
  };
  return (
    <div className={`border rounded-xl p-4 ${cls[color]}`}>
      <p className="font-semibold mb-2 text-sm">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs flex items-start gap-1.5">
            <span className="mt-0.5 flex-shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label, hint, value, onChange, multiline, maxLength,
}: {
  label:      string;
  hint?:      string;
  value:      string;
  onChange:   (v: string) => void;
  multiline?: boolean;
  maxLength?: number;
}) {
  const over = maxLength ? value.length > maxLength : false;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-0.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {maxLength && (
          <span className={`text-xs ${over ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{hint}</p>}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className={`w-full border rounded-lg px-3 py-2 text-sm resize-none
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${over ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-sm
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${over ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
        />
      )}
    </div>
  );
}

function Toggle({
  label, hint, checked, onChange,
}: {
  label:    string;
  hint?:    string;
  checked:  boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600"
      />
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function RedirectsTab({
  redirects, onAdd, onRemove,
}: {
  redirects: Redirect[];
  onAdd:     (from: string, to: string, code: 301 | 302) => Promise<void>;
  onRemove:  (id: string) => Promise<void>;
}) {
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');
  const [code,    setCode]    = useState<301 | 302>(301);
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!from.startsWith('/'))  { setErr('From path must start with /');      return; }
    if (!to.trim())             { setErr('To path is required');               return; }
    if (from === to)            { setErr('From and To must differ');           return; }
    setErr(''); setLoading(true);
    try { await onAdd(from, to, code); setFrom(''); setTo(''); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add Redirect</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="From Path" hint="e.g. /old-page" value={from} onChange={setFrom} />
          <Field label="To Path / URL" hint="e.g. /new-page" value={to} onChange={setTo} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={code}
            onChange={e => setCode(Number(e.target.value) as 301 | 302)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value={301}>301 — Permanent</option>
            <option value={302}>302 — Temporary</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 hover:bg-blue-700"
          >
            {loading ? 'Adding…' : 'Add Redirect'}
          </button>
          {err && <span className="text-sm text-red-500">{err}</span>}
        </div>
      </div>

      {redirects.length === 0 ? (
        <p className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">No redirects configured.</p>
      ) : (
        <div className="space-y-2">
          {redirects.map(r => (
            <div key={r.id} className={`flex items-center justify-between px-4 py-3 border rounded-xl text-sm ${
              r.isActive
                ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60'
            }`}>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                  r.statusCode === 301
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                }`}>
                  {r.statusCode}
                </span>
                <code className="text-gray-600 dark:text-gray-400 truncate max-w-[100px] sm:max-w-[140px] text-xs">{r.fromPath}</code>
                <span className="text-gray-400 flex-shrink-0">→</span>
                <code className="text-gray-800 dark:text-gray-200 truncate max-w-[100px] sm:max-w-[140px] text-xs">{r.toPath}</code>
              </div>
              <button
                onClick={() => { if (confirm('Remove this redirect?')) onRemove(r.id); }}
                className="ml-3 text-xs text-red-500 hover:text-red-700 flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SchemaPreviewTab({ subdomain }: { subdomain: string }) {
  const [schema,  setSchema]  = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    if (!subdomain) return;
    setLoading(true);
    seoApi.getSchema(subdomain)
      .then(res => setSchema(res.data ?? res))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [subdomain]);

  if (loading) return <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Loading schema…</div>;
  if (err)     return <div className="text-center py-8 text-red-400 text-sm">{err}</div>;
  if (!schema) return <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No schema data available.</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Preview of your auto-generated Schema.org structured data.{' '}
        <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 underline">
          Test it in Schema Validator →
        </a>
      </p>
      <pre className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-800 dark:text-gray-200 overflow-auto max-h-96 leading-relaxed">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}
