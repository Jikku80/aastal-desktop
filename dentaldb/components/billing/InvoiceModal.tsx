'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Loader2, Search, ChevronDown, Stethoscope, Package, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { billingApi, patientsApi, appointmentsApi, servicesApi, inventoryApi, usersApi, bloodTestApi, labApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { format } from 'date-fns';
import { formatNepalDateTime } from '@/lib/timezone';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ServiceLine { serviceId: string; serviceName: string; qty: number; unitPrice: number; doctorId: string; }
interface ProductLine { productId: string; productName: string; qty: number; unitPrice: number; }
interface TestLine { id: string; type: 'blood' | 'lab'; name: string; cost: number; }

// ── Patient Combobox ──────────────────────────────────────────────────────────
function PatientCombobox({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
  const { activeBranch } = useAuthStore();
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const [label, setLabel] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['pts-search', query],
    queryFn:  () => patientsApi.list({ limit: 30, search: query || undefined, branchId: activeBranch?.id }).then(r => r.data),
  });
  const patients = data?.data || [];

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const select = (p: any) => {
    const name = `${p.firstName} ${p.lastName}`;
    onChange(p.id, name); setLabel(name); setQuery(''); setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="input flex items-center gap-2 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <Search size={13} className="text-[var(--text-muted)] shrink-0" />
        <input value={open ? query : label} onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onClick={e => { e.stopPropagation(); setOpen(true); }}
          placeholder="Search patient by name or phone…"
          className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
        {label && !open && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange('', ''); setLabel(''); }}
            className="text-[var(--text-muted)] hover:text-red-400"><X size={12} /></button>
        )}
        <ChevronDown size={12} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl shadow-2xl max-h-52 overflow-y-auto"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {patients.length === 0
            ? <p className="text-xs text-[var(--text-muted)] text-center py-4">{query ? `No results for "${query}"` : 'No patients yet'}</p>
            : patients.map((p: any) => (
              <button key={p.id} type="button" onClick={() => select(p)}
                className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-3"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-7 h-7 rounded-full bg-brand-600/15 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                  {p.firstName?.[0]}{p.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{p.firstName} {p.lastName}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{p.phone || p.email || '—'}</p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
      <Icon size={15} />
      {label}
    </div>
  );
}

// ── Empty state row ───────────────────────────────────────────────────────────
function EmptyRow({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-dashed border-[var(--border)] text-[var(--text-muted)] text-sm">
      <span>No {label} added yet</span>
      <button type="button" onClick={onAdd} className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
        <Plus size={11} /> Add
      </button>
    </div>
  );
}

// ── Service Line ──────────────────────────────────────────────────────────────
function ServiceLineRow({
  line, index, services, doctors, onChange, onRemove,
}: {
  line: ServiceLine; index: number;
  services: any[]; doctors: any[];
  onChange: (i: number, field: keyof ServiceLine, val: any) => void;
  onRemove: (i: number) => void;
}) {
  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const svc = services.find(s => s.id === e.target.value);
    if (svc) {
      onChange(index, 'serviceId', svc.id);
      onChange(index, 'serviceName', svc.name);
      onChange(index, 'unitPrice', Number(svc.price) || 0);
    }
  };
  const subtotal = line.qty * line.unitPrice;
  const doctor = doctors.find(d => d.id === line.doctorId);

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <select value={line.serviceId} onChange={handleServiceSelect} className="input w-full text-sm py-1.5">
            <option value="">— Select service —</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} — NPR {Number(s.price).toLocaleString()}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => onRemove(index)} className="text-[var(--text-muted)] hover:text-red-400 mt-1.5 shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5 block">Qty</label>
          <input type="number" min={1} value={line.qty} onChange={e => onChange(index, 'qty', Number(e.target.value))}
            className="input w-full py-1.5 text-sm text-center" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5 block">Unit Price</label>
          <input type="number" min={0} value={line.unitPrice} onChange={e => onChange(index, 'unitPrice', Number(e.target.value))}
            className="input w-full py-1.5 text-sm text-right" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5 block">Subtotal</label>
          <div className="input w-full py-1.5 text-sm text-right bg-[var(--bg-muted)] text-[var(--text-secondary)]">
            NPR {subtotal.toLocaleString()}
          </div>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5 block flex items-center gap-1">
          <Stethoscope size={9} /> Doctor (commission applies to this service)
        </label>
        <select value={line.doctorId} onChange={e => onChange(index, 'doctorId', e.target.value)} className="input w-full py-1.5 text-sm">
          <option value="">— No doctor / no commission —</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id}>
              Dr. {d.firstName} {d.lastName}{d.commissionRate ? ` (${d.commissionRate}% commission)` : ''}
            </option>
          ))}
        </select>
        {doctor?.commissionRate && (
          <p className="text-[10px] text-emerald-400 mt-0.5">
            Est. commission: NPR {((subtotal * doctor.commissionRate) / 100).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Product Line ──────────────────────────────────────────────────────────────
function ProductLineRow({
  line, index, products, onChange, onRemove,
}: {
  line: ProductLine; index: number;
  products: any[];
  onChange: (i: number, field: keyof ProductLine, val: any) => void;
  onRemove: (i: number) => void;
}) {
  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prod = products.find(p => p.id === e.target.value);
    if (prod) {
      onChange(index, 'productId', prod.id);
      onChange(index, 'productName', prod.name);
      onChange(index, 'unitPrice', Number(prod.price) || 0);
    }
  };
  const subtotal = line.qty * line.unitPrice;

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <select value={line.productId} onChange={handleProductSelect} className="input w-full text-sm py-1.5">
            <option value="">— Select product —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} — NPR {Number(p.price).toLocaleString()}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => onRemove(index)} className="text-[var(--text-muted)] hover:text-red-400 mt-1.5 shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5 block">Qty</label>
          <input type="number" min={1} value={line.qty} onChange={e => onChange(index, 'qty', Number(e.target.value))}
            className="input w-full py-1.5 text-sm text-center" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5 block">Unit Price</label>
          <input type="number" min={0} value={line.unitPrice} onChange={e => onChange(index, 'unitPrice', Number(e.target.value))}
            className="input w-full py-1.5 text-sm text-right" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5 block">Subtotal</label>
          <div className="input w-full py-1.5 text-sm text-right bg-[var(--bg-muted)] text-[var(--text-secondary)]">
            NPR {subtotal.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function InvoiceModal({
  onClose, onSuccess, initialPatientId, initialPatientName, initialAppointmentId,
}: {
  onClose: () => void; onSuccess: () => void;
  initialPatientId?: string; initialPatientName?: string; initialAppointmentId?: string;
}) {
  const { activeBranch, clinic } = useAuthStore();
  useBodyScrollLock(true);
  const globalVat = (clinic as any)?.settings?.vatPercent ?? 0;

  // Patient & appointment
  const [patientId,     setPatientId]     = useState(initialPatientId || '');
  const [patientName,   setPatientName]   = useState(initialPatientName || '');
  const [appointmentId, setAppointmentId] = useState(initialAppointmentId || '');
  const [linkAppt,      setLinkAppt]      = useState(!!initialAppointmentId);

  // Billing type
  const [billingType, setBillingType] = useState<'service' | 'product' | 'both'>('service');

  // Lines
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [testLines,    setTestLines]    = useState<TestLine[]>([]);

  // Totals
  const [taxPercent,     setTaxPercent]     = useState(Number(globalVat));
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod,  setPaymentMethod]  = useState('');
  const [notes,          setNotes]          = useState('');
  const [status,         setStatus]         = useState('not_yet_paid');
  const [dueDate,        setDueDate]        = useState('');

  // Data fetching
  const { data: servicesData, isLoading: servLoading } = useQuery({
    queryKey: ['services-active-inv'],
    queryFn:  () => servicesApi.list({ limit: 200, activeOnly: 'true' }).then(r => r.data),
  });
  const { data: productsData } = useQuery({
    queryKey: ['inventory-active-inv', activeBranch?.id],
    queryFn:  () => inventoryApi.list({ limit: 200, activeOnly: 'true', branchId: activeBranch?.id || undefined }).then(r => r.data),
  });
  const { data: staffData } = useQuery({
    queryKey: ['staff-doctors-inv'],
    queryFn:  () => usersApi.listStaff({ limit: 100 }).then(r => r.data),
  });
  const { data: aptsData } = useQuery({
    queryKey: ['patient-apts-inv', patientId],
    queryFn:  () => appointmentsApi.list({ patientId, status: 'completed', isPaid: 'false', limit: 50, order: 'DESC' }).then(r => r.data),
    enabled:  !!patientId && linkAppt,
  });
  const { data: unbilledBlood } = useQuery({
    queryKey: ['unbilled-blood-inv', patientId],
    queryFn:  () => bloodTestApi.unbilledByPatient(patientId).then(r => r.data),
    enabled:  !!patientId,
  });
  const { data: unbilledLab } = useQuery({
    queryKey: ['unbilled-lab-inv', patientId],
    queryFn:  () => labApi.unbilledByPatient(patientId).then(r => r.data),
    enabled:  !!patientId,
  });

  const services = servicesData?.data || [];
  const products = productsData?.data || [];
  const doctors  = (staffData?.data || []).filter((u: any) => /doctor|dentist/i.test(u.role));
  const apts     = aptsData?.data || [];
  const pendingBloodTests = (unbilledBlood || []).filter((t: any) => !testLines.some(l => l.id === t.id));
  const pendingLabWork    = (unbilledLab   || []).filter((t: any) => !testLines.some(l => l.id === t.id));

  // Computed totals
  const serviceSubtotal = serviceLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const productSubtotal = productLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const testSubtotal    = testLines.reduce((s, l) => s + Number(l.cost || 0), 0);
  const subtotal        = serviceSubtotal + productSubtotal + testSubtotal;
  const taxAmount       = subtotal * (taxPercent / 100);
  const total           = Math.max(subtotal + taxAmount - discountAmount, 0);

  // Test line helpers
  const addTestLine    = (t: any, type: 'blood' | 'lab') =>
    setTestLines(p => [...p, { id: t.id, type, name: t.testName, cost: Number(t.cost || 0) }]);
  const removeTestLine = (id: string) => setTestLines(p => p.filter(l => l.id !== id));

  // Service line helpers
  const addServiceLine  = () => setServiceLines(p => [...p, { serviceId: '', serviceName: '', qty: 1, unitPrice: 0, doctorId: '' }]);
  const removeServiceLine = (i: number) => setServiceLines(p => p.filter((_, idx) => idx !== i));
  const updateServiceLine = (i: number, field: keyof ServiceLine, val: any) =>
    setServiceLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  // Product line helpers
  const addProductLine  = () => setProductLines(p => [...p, { productId: '', productName: '', qty: 1, unitPrice: 0 }]);
  const removeProductLine = (i: number) => setProductLines(p => p.filter((_, idx) => idx !== i));
  const updateProductLine = (i: number, field: keyof ProductLine, val: any) =>
    setProductLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  // Auto-populate from appointment
  const handleApptChange = (apptId: string) => {
    setAppointmentId(apptId);
    if (!apptId) return;
    const apt = apts.find((a: any) => a.id === apptId);
    if (apt && serviceLines.length === 0) {
      const svc = services.find((s: any) => s.id === apt.serviceId);
      setServiceLines([{
        serviceId:   apt.serviceId || svc?.id || '',
        serviceName: svc?.name || (apt.type || 'consultation').replace(/_/g, ' '),
        qty:         1,
        unitPrice:   Number(svc?.price || apt.fee || 0),
        doctorId:    apt.dentistId || '',
      }]);
    }
  };

  // When opened directly from the queue with a known appointment, auto-fill the service line
  // as soon as that appointment's data is loaded.
  useEffect(() => {
    if (initialAppointmentId && apts.length > 0 && serviceLines.length === 0) {
      handleApptChange(initialAppointmentId);
    }
  }, [initialAppointmentId, apts.length]);

  const mutation = useMutation({
    mutationFn: () => {
      const allItems = [
        ...serviceLines.map(l => ({
          description: l.serviceName || 'Service',
          quantity:    l.qty,
          unitPrice:   l.unitPrice,
          total:       l.qty * l.unitPrice,
          serviceId:   l.serviceId || undefined,
          doctorId:    l.doctorId  || undefined,
        })),
        ...productLines.map(l => ({
          description: l.productName || 'Product',
          quantity:    l.qty,
          unitPrice:   l.unitPrice,
          total:       l.qty * l.unitPrice,
          productId:   l.productId || undefined,
        })),
        ...testLines.map(l => ({
          description: l.name,
          quantity:    1,
          unitPrice:   l.cost,
          total:       l.cost,
          bloodTestId: l.type === 'blood' ? l.id : undefined,
          labWorkId:   l.type === 'lab'   ? l.id : undefined,
        })),
      ];
      if (allItems.length === 0) throw new Error('Add at least one service or product');

      return billingApi.createInvoice({
        patientId,
        appointmentId: appointmentId || undefined,
        branchId:      activeBranch?.id,
        items:         allItems,
        subtotal, taxPercent, taxAmount, discountAmount,
        total, dueAmount: total, paidAmount: 0,
        paymentMethod: paymentMethod || undefined,
        notes:         notes || undefined,
        status, dueDate: dueDate || undefined,
      });
    },
    onSuccess,
    onError: (e: any) => toast.error(e?.message || e?.response?.data?.message || 'Failed to create invoice'),
  });

  const showServices = billingType === 'service' || billingType === 'both';
  const showProducts = billingType === 'product' || billingType === 'both';

  return (
    <div className="fixed inset-0 z-[200] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-[var(--accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">New Invoice</h2>
          </div>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={17} /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 flex-1">

          {/* ① Patient */}
          <div>
            <label className="label">Patient *</label>
            <PatientCombobox value={patientId} onChange={(id, name) => { setPatientId(id); setPatientName(name); setAppointmentId(''); }} />
          </div>

          {/* ② Billing type selector */}
          <div>
            <label className="label">Billing Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'service', label: 'Services Only',  Icon: Stethoscope },
                { key: 'product', label: 'Products Only',  Icon: Package },
                { key: 'both',    label: 'Services + Products', Icon: Receipt },
              ] as const).map(opt => (
                <button key={opt.key} type="button" onClick={() => setBillingType(opt.key)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                    billingType === opt.key
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                  }`}>
                  <opt.Icon size={16} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ③ Link to appointment (optional) */}
          {patientId && (
            <div>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer select-none">
                <input type="checkbox" checked={linkAppt} onChange={e => { setLinkAppt(e.target.checked); if (!e.target.checked) setAppointmentId(''); }}
                  className="rounded" />
                Link to an appointment <span className="text-[var(--text-muted)] text-xs">(optional)</span>
              </label>
              {linkAppt && (
                <select value={appointmentId} onChange={e => handleApptChange(e.target.value)} className="input w-full mt-2 text-sm">
                  <option value="">— Select appointment —</option>
                  {apts.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {formatNepalDateTime(a.scheduledAt)} — {(a.type || '').replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ④ Services section */}
          {showServices && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionHeader icon={Stethoscope} label="Services" color="text-blue-400" />
                <button type="button" onClick={addServiceLine}
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                  <Plus size={11} /> Add Service
                </button>
              </div>
              {services.length === 0 && !servLoading && (
                <div className="text-xs text-amber-400 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  No services configured. Please create services from the Services page first.
                </div>
              )}
              {serviceLines.length === 0
                ? <EmptyRow label="services" onAdd={addServiceLine} />
                : serviceLines.map((l, i) => (
                  <ServiceLineRow key={i} line={l} index={i} services={services} doctors={doctors}
                    onChange={updateServiceLine} onRemove={removeServiceLine} />
                ))
              }
              {serviceLines.length > 0 && (
                <div className="flex justify-end text-sm text-[var(--text-secondary)]">
                  Service subtotal: <span className="font-semibold text-[var(--text-primary)] ml-1">NPR {serviceSubtotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* ⑤ Products section */}
          {showProducts && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionHeader icon={Package} label="Products" color="text-emerald-400" />
                <button type="button" onClick={addProductLine}
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                  <Plus size={11} /> Add Product
                </button>
              </div>
              {productLines.length === 0
                ? <EmptyRow label="products" onAdd={addProductLine} />
                : productLines.map((l, i) => (
                  <ProductLineRow key={i} line={l} index={i} products={products}
                    onChange={updateProductLine} onRemove={removeProductLine} />
                ))
              }
              {productLines.length > 0 && (
                <div className="flex justify-end text-sm text-[var(--text-secondary)]">
                  Product subtotal: <span className="font-semibold text-[var(--text-primary)] ml-1">NPR {productSubtotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Lab & Blood Tests section — only meaningful once a patient is selected */}
          {patientId && (pendingBloodTests.length > 0 || pendingLabWork.length > 0 || testLines.length > 0) && (
            <div className="space-y-2">
              <SectionHeader icon={Receipt} label="Lab & Blood Tests" color="text-amber-400" />
              {testLines.length > 0 && (
                <div className="space-y-1.5">
                  {testLines.map(l => (
                    <div key={l.id} className="flex items-center justify-between py-2 px-3 rounded-xl"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <span className="text-sm text-[var(--text-primary)]">{l.name} <span className="text-[10px] text-[var(--text-muted)] uppercase ml-1">{l.type === 'blood' ? 'Blood Test' : 'Lab Work'}</span></span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--text-secondary)]">NPR {l.cost.toLocaleString()}</span>
                        <button type="button" onClick={() => removeTestLine(l.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(pendingBloodTests.length > 0 || pendingLabWork.length > 0) && (
                <div className="space-y-1.5">
                  {pendingBloodTests.map((t: any) => (
                    <button key={t.id} type="button" onClick={() => addTestLine(t, 'blood')}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-xl border border-dashed border-[var(--border)] text-left hover:bg-white/5 transition-colors">
                      <span className="text-sm text-[var(--text-secondary)]">{t.testName} <span className="text-[10px] uppercase ml-1">Blood Test</span></span>
                      <span className="flex items-center gap-1 text-xs text-[var(--accent)]"><Plus size={11} /> NPR {Number(t.cost).toLocaleString()}</span>
                    </button>
                  ))}
                  {pendingLabWork.map((t: any) => (
                    <button key={t.id} type="button" onClick={() => addTestLine(t, 'lab')}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-xl border border-dashed border-[var(--border)] text-left hover:bg-white/5 transition-colors">
                      <span className="text-sm text-[var(--text-secondary)]">{t.testName} <span className="text-[10px] uppercase ml-1">Lab Work</span></span>
                      <span className="flex items-center gap-1 text-xs text-[var(--accent)]"><Plus size={11} /> NPR {Number(t.cost).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
              {testLines.length > 0 && (
                <div className="flex justify-end text-sm text-[var(--text-secondary)]">
                  Test subtotal: <span className="font-semibold text-[var(--text-primary)] ml-1">NPR {testSubtotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* ⑥ Totals */}
          <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Summary</p>
            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span>Subtotal</span><span>NPR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <span>VAT (%)</span>
                <input type="number" value={taxPercent} onChange={e => setTaxPercent(Number(e.target.value))} min={0} max={100}
                  className="w-14 px-2 py-0.5 text-xs rounded-lg text-center"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
              </div>
              <span>NPR {taxAmount.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <span>Discount (NPR)</span>
                <input type="number" value={discountAmount} onChange={e => setDiscountAmount(Number(e.target.value))} min={0}
                  className="w-20 px-2 py-0.5 text-xs rounded-lg text-right"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
              </div>
              <span>− NPR {discountAmount.toLocaleString()}</span>
            </div>
            <div className="pt-2 flex justify-between font-bold text-[var(--text-primary)] text-base" style={{ borderTop: '1px solid var(--border)' }}>
              <span>Total</span><span>NPR {total.toLocaleString()}</span>
            </div>
          </div>

          {/* ⑦ Payment & Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="input w-full text-sm">
                <option value="not_yet_paid">Not Yet Paid</option>
                <option value="paid">Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input w-full text-sm">
                <option value="">— None yet —</option>
                <option value="cash">Cash</option>
                <option value="esewa">eSewa</option>
                <option value="khalti">Khalti</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input w-full text-sm" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className="input w-full text-sm" placeholder="Internal note…" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !patientId || (serviceLines.length === 0 && productLines.length === 0)}
              className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
