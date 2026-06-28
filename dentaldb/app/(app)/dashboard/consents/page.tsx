'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Save, X, CheckSquare } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function ConsentsPage() {
  const { user } = useAuthStore();
  const clinicId = user?.clinicId;
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    bodyText: '',
    requiredCheckboxes: [{ label: 'I have read and understood the above', required: true }] as { label: string; required: boolean }[],
    specialty: '',
  });

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/consents/templates?clinicId=${clinicId}`);
      const data = await r.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [clinicId]);

  const save = async () => {
    if (!clinicId || !form.name.trim() || !form.bodyText.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/consents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clinicId }),
      });
      setShowBuilder(false);
      setForm({ name: '', bodyText: '', requiredCheckboxes: [{ label: 'I have read and understood the above', required: true }], specialty: '' });
      load();
    } catch { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteTemplate = async (id: string) => {
    await fetch(`/api/consents/templates/${id}`, { method: 'DELETE' });
    load();
  };

  const addCheckbox = () => setForm(f => ({ ...f, requiredCheckboxes: [...f.requiredCheckboxes, { label: '', required: true }] }));
  const updateCheckbox = (i: number, label: string) => setForm(f => ({ ...f, requiredCheckboxes: f.requiredCheckboxes.map((c, j) => j === i ? { ...c, label } : c) }));
  const removeCheckbox = (i: number) => setForm(f => ({ ...f, requiredCheckboxes: f.requiredCheckboxes.filter((_, j) => j !== i) }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-Consent Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Digital consent forms patients sign before procedures</p>
        </div>
        <button onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700">
          <Plus size={16} /> New Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Shield size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-600">No consent templates</p>
          <p className="text-gray-400 text-sm mt-1">Create consent templates for procedures, photography, data sharing, etc.</p>
          <button onClick={() => setShowBuilder(true)} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  {t.specialty && <p className="text-gray-400 text-xs mt-0.5 capitalize">{t.specialty}</p>}
                </div>
                <button onClick={() => deleteTemplate(t.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg">
                  <Trash2 size={15} />
                </button>
              </div>
              <p className="text-gray-500 text-xs line-clamp-2 mb-2">{t.bodyText}</p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <CheckSquare size={12} />
                <span>{(t.requiredCheckboxes || []).length} consent checkbox{(t.requiredCheckboxes || []).length !== 1 ? 'es' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuilder && (
        <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBuilder(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-900">New Consent Template</h2>
              <button onClick={() => setShowBuilder(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Template Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Treatment Consent, Photography Consent"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Specialty (optional)</label>
                  <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    placeholder="dental, general, etc."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Consent Text *</label>
                <textarea value={form.bodyText} onChange={e => setForm(f => ({ ...f, bodyText: e.target.value }))}
                  rows={8} placeholder="Describe the procedure, risks, benefits, and what the patient is consenting to…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Consent Checkboxes</label>
                  <button onClick={addCheckbox} className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
                    <Plus size={14} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.requiredCheckboxes.map((cb, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckSquare size={16} className="text-blue-400 flex-shrink-0" />
                      <input value={cb.label} onChange={e => updateCheckbox(i, e.target.value)}
                        placeholder="Checkbox label"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                      <button onClick={() => removeCheckbox(i)} className="text-red-400 hover:text-red-600">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowBuilder(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 font-medium">
                Cancel
              </button>
              <button onClick={save} disabled={saving || !form.name.trim() || !form.bodyText.trim()}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-blue-700">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
