'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, ClipboardList, Save, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const api = {
  getTemplates: async (clinicId: string) => {
    const r = await fetch(`/api/intake-forms/templates?clinicId=${clinicId}`);
    return r.json();
  },
  createTemplate: async (data: any) => {
    const r = await fetch('/api/intake-forms/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  deleteTemplate: async (id: string) => {
    await fetch(`/api/intake-forms/templates/${id}`, { method: 'DELETE' });
  },
};

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File Upload' },
];

function FieldBuilder({ field, index, onChange, onRemove }: any) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
      <div className="flex items-center gap-3">
        <GripVertical size={16} className="text-gray-300 cursor-grab flex-shrink-0" />
        <div className="flex-1 grid grid-cols-3 gap-3">
          <input value={field.label} onChange={e => onChange({ ...field, label: e.target.value })}
            placeholder="Field label *"
            className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
          <select value={field.type} onChange={e => onChange({ ...field, type: e.target.value })}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 flex-shrink-0">
          <input type="checkbox" checked={field.required} onChange={e => onChange({ ...field, required: e.target.checked })}
            className="w-3.5 h-3.5 accent-blue-600" />
          Required
        </label>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 flex-shrink-0">
          <X size={16} />
        </button>
      </div>
      {(field.type === 'select' || field.type === 'multi_select') && (
        <div>
          <label className="text-xs text-gray-500 block mb-1">Options (comma-separated)</label>
          <input value={(field.options || []).join(', ')}
            onChange={e => onChange({ ...field, options: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
            placeholder="Option 1, Option 2, Option 3"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
        </div>
      )}
    </div>
  );
}

export default function IntakeFormsPage() {
  const { user } = useAuthStore();
  const clinicId = user?.clinicId;
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [form, setForm] = useState({ name: '', specialty: '', fields: [] as any[] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    try { const data = await api.getTemplates(clinicId); setTemplates(Array.isArray(data) ? data : []); }
    catch { setTemplates([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [clinicId]);

  const addField = () => setForm(f => ({
    ...f, fields: [...f.fields, { id: Date.now().toString(), label: '', type: 'text', required: false }]
  }));

  const saveTemplate = async () => {
    if (!clinicId || !form.name.trim() || form.fields.length === 0) return;
    setSaving(true);
    try {
      await api.createTemplate({ ...form, clinicId });
      setShowBuilder(false);
      setForm({ name: '', specialty: '', fields: [] });
      load();
    } catch { alert('Failed to save template'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intake Forms</h1>
          <p className="text-gray-500 text-sm mt-1">Create forms patients fill before their appointment</p>
        </div>
        <button onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> New Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <ClipboardList size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-600">No intake form templates</p>
          <p className="text-gray-400 text-sm mt-1">Create a template to collect patient information before appointments</p>
          <button onClick={() => setShowBuilder(true)} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  {t.specialty && <p className="text-gray-400 text-xs mt-0.5 capitalize">{t.specialty}</p>}
                  <p className="text-gray-500 text-sm mt-2">{(t.fields || []).length} fields</p>
                </div>
                <button onClick={() => api.deleteTemplate(t.id).then(load)}
                  className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(t.fields || []).slice(0, 4).map((f: any) => (
                  <span key={f.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f.label}</span>
                ))}
                {(t.fields || []).length > 4 && <span className="text-xs text-gray-400">+{t.fields.length - 4} more</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBuilder(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-900">Build Intake Form</h2>
              <button onClick={() => setShowBuilder(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Form Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. New Patient Registration"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Specialty</label>
                  <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    placeholder="dental, general, etc."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Fields</label>
                  <button onClick={addField} className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                    <Plus size={14} /> Add Field
                  </button>
                </div>
                <div className="space-y-2">
                  {form.fields.map((field, i) => (
                    <FieldBuilder key={field.id} field={field} index={i}
                      onChange={(updated: any) => setForm(f => ({ ...f, fields: f.fields.map((x, j) => j === i ? updated : x) }))}
                      onRemove={() => setForm(f => ({ ...f, fields: f.fields.filter((_, j) => j !== i) }))} />
                  ))}
                  {form.fields.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                      <p className="text-gray-400 text-sm">Click "Add Field" to start building your form</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowBuilder(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-gray-600 text-sm font-medium">
                Cancel
              </button>
              <button onClick={saveTemplate} disabled={saving || !form.name.trim() || form.fields.length === 0}
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
