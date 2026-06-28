'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Activity, Thermometer, Heart, Wind, Weight, Ruler, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import { vitalsApi } from '@/lib/api';

interface VitalsData {
  systolic?:    number | '';
  diastolic?:   number | '';
  pulse?:       number | '';
  temperature?: number | '';
  weight?:      number | '';
  height?:      number | '';
  spo2?:        number | '';
  bloodSugar?:  number | '';
  notes?:       string;
}

// ── Range helpers ─────────────────────────────────────────────────────────────
type AlertLevel = 'normal' | 'amber' | 'red';

function bpAlert(systolic: number | '', diastolic: number | ''): AlertLevel {
  if (systolic === '' || diastolic === '') return 'normal';
  if (Number(systolic) > 140 || Number(diastolic) > 90) return 'red';
  return 'normal';
}
function spo2Alert(v: number | ''): AlertLevel {
  if (v === '') return 'normal';
  return Number(v) < 95 ? 'red' : 'normal';
}
function tempAlert(v: number | ''): AlertLevel {
  if (v === '') return 'normal';
  return Number(v) > 37.5 ? 'amber' : 'normal';
}

const ALERT_STYLES: Record<AlertLevel, string> = {
  normal: '',
  amber:  'ring-2 ring-amber-400/60 bg-amber-400/5',
  red:    'ring-2 ring-red-400/60 bg-red-400/5',
};
const ALERT_TEXT: Record<AlertLevel, string> = {
  normal: '',
  amber:  'text-amber-400',
  red:    'text-red-400',
};

// ── Single field ─────────────────────────────────────────────────────────────
function VitalField({
  label, icon: Icon, value, onChange, unit, placeholder, alert = 'normal', hint,
}: {
  label: string; icon: any; value: number | ''; onChange: (v: number | '') => void;
  unit?: string; placeholder?: string; alert?: AlertLevel; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Icon size={11} className={alert !== 'normal' ? ALERT_TEXT[alert] : ''} />
          {label}
        </label>
        {hint && <span className={`text-[10px] font-medium ${ALERT_TEXT[alert]}`}>{hint}</span>}
      </div>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={placeholder}
          className={`input w-full pr-10 text-sm ${ALERT_STYLES[alert]}`}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VitalsForm({ appointmentId, compact = false }: { appointmentId: string; compact?: boolean }) {
  const qc = useQueryClient();

  const { data: existing, isLoading } = useQuery({
    queryKey: ['vitals', appointmentId],
    queryFn: () => vitalsApi.getForAppointment(appointmentId).then(r => r.data),
    enabled: !!appointmentId,
  });

  const [systolic,    setSystolic]    = useState<number | ''>('');
  const [diastolic,   setDiastolic]   = useState<number | ''>('');
  const [pulse,       setPulse]       = useState<number | ''>('');
  const [temperature, setTemperature] = useState<number | ''>('');
  const [weight,      setWeight]      = useState<number | ''>('');
  const [height,      setHeight]      = useState<number | ''>('');
  const [spo2,        setSpo2]        = useState<number | ''>('');
  const [bloodSugar,  setBloodSugar]  = useState<number | ''>('');
  const [notes,       setNotes]       = useState('');

  // Populate from existing
  useEffect(() => {
    if (!existing) return;
    setSystolic(existing.systolic ?? '');
    setDiastolic(existing.diastolic ?? '');
    setPulse(existing.pulse ?? '');
    setTemperature(existing.temperature ?? '');
    setWeight(existing.weight ?? '');
    setHeight(existing.height ?? '');
    setSpo2(existing.spo2 ?? '');
    setBloodSugar(existing.bloodSugar ?? '');
    setNotes(existing.notes ?? '');
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: VitalsData = { notes };
      if (systolic    !== '') payload.systolic    = systolic;
      if (diastolic   !== '') payload.diastolic   = diastolic;
      if (pulse       !== '') payload.pulse       = pulse;
      if (temperature !== '') payload.temperature = temperature;
      if (weight      !== '') payload.weight      = weight;
      if (height      !== '') payload.height      = height;
      if (spo2        !== '') payload.spo2        = spo2;
      if (bloodSugar  !== '') payload.bloodSugar  = bloodSugar;
      return vitalsApi.upsertForAppointment(appointmentId, payload);
    },
    onSuccess: () => {
      toast.success('Vitals saved');
      qc.invalidateQueries({ queryKey: ['vitals', appointmentId] });
      qc.invalidateQueries({ queryKey: ['vitals-history'] });
    },
    onError: () => toast.error('Failed to save vitals'),
  });

  const bpLevel   = bpAlert(systolic, diastolic);
  const spo2Level = spo2Alert(spo2);
  const tempLevel = tempAlert(temperature);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      {(bpLevel === 'red' || spo2Level === 'red') && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/20">
          <Activity size={13} />
          {bpLevel === 'red' && <span>BP elevated (≥140/90 mmHg)</span>}
          {bpLevel === 'red' && spo2Level === 'red' && <span className="text-red-300">·</span>}
          {spo2Level === 'red' && <span>SpO₂ low (&lt;95%)</span>}
        </div>
      )}
      {tempLevel === 'amber' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20">
          <Thermometer size={13} />
          <span>Fever detected (&gt;37.5°C)</span>
        </div>
      )}

      {/* Blood Pressure row */}
      <div
        className={`rounded-xl p-3 ${bpLevel !== 'normal' ? ALERT_STYLES[bpLevel] : ''}`}
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${bpLevel !== 'normal' ? ALERT_TEXT[bpLevel] : 'text-[var(--text-muted)]'}`}>
          <Heart size={11} /> Blood Pressure
          {bpLevel === 'red' && <span className="ml-auto">⚠ Elevated</span>}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <VitalField label="Systolic"  icon={Heart} value={systolic}  onChange={setSystolic}  unit="mmHg" placeholder="120" alert={bpLevel} />
          <VitalField label="Diastolic" icon={Heart} value={diastolic} onChange={setDiastolic} unit="mmHg" placeholder="80"  alert={bpLevel} />
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-2">Normal: &lt;120/80 · High: ≥140/90</p>
      </div>

      {/* Other vitals grid */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        <VitalField
          label="Pulse" icon={Activity} value={pulse} onChange={setPulse}
          unit="bpm" placeholder="72"
        />
        <VitalField
          label="Temperature" icon={Thermometer} value={temperature} onChange={setTemperature}
          unit="°C" placeholder="37.0"
          alert={tempLevel}
          hint={tempLevel === 'amber' ? 'Fever' : undefined}
        />
        <VitalField
          label="SpO₂" icon={Wind} value={spo2} onChange={setSpo2}
          unit="%" placeholder="98"
          alert={spo2Level}
          hint={spo2Level === 'red' ? 'Low' : undefined}
        />
        <VitalField
          label="Weight" icon={Weight} value={weight} onChange={setWeight}
          unit="kg" placeholder="70"
        />
        <VitalField
          label="Height" icon={Ruler} value={height} onChange={setHeight}
          unit="cm" placeholder="170"
        />
        <VitalField
          label="Blood Sugar" icon={Droplets} value={bloodSugar} onChange={setBloodSugar}
          unit="mmol/L" placeholder="5.5"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="input w-full resize-none text-sm"
          rows={2}
          placeholder="Any additional observations…"
        />
      </div>

      {/* Save */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="btn-primary w-full justify-center"
      >
        {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {existing ? 'Update Vitals' : 'Save Vitals'}
      </button>
    </div>
  );
}