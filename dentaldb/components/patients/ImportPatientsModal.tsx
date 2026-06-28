'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { patientsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

// ── Expected columns (case-insensitive matching) ───────────────────────────
const COLUMN_MAP: Record<string, string> = {
  // opdNo
  'opd no': 'opdNo', 'opd no.': 'opdNo', 'opd number': 'opdNo', 'opdno': 'opdNo',
  // name
  'first name': 'firstName', 'firstname': 'firstName',
  'last name': 'lastName', 'lastname': 'lastName',
  // contact
  'email': 'email',
  'phone': 'phone', 'mobile': 'phone', 'contact': 'phone', 'phone number': 'phone',
  // age / gender
  'age': 'ageYears', 'age (years)': 'ageYears', 'age years': 'ageYears',
  'gender': 'gender', 'sex': 'gender',
  // other
  'address': 'address',
  'allergies': 'allergies',
  'medical conditions': 'medicalConditions', 'conditions': 'medicalConditions',
  'insurance provider': 'insuranceProvider',
  'insurance policy number': 'insurancePolicyNumber', 'policy number': 'insurancePolicyNumber',
  'notes': 'notes',
  'date of birth': 'dateOfBirth', 'dob': 'dateOfBirth',
  // created at — for backdating old patients
  'created at': 'createdAt', 'registration date': 'createdAt', 'reg date': 'createdAt',
};

const REQUIRED_COLUMNS = ['firstName', 'lastName'];
const SAMPLE_COLUMNS = [
  'OPD No.', 'First Name', 'Last Name', 'Email', 'Phone', 'Age', 'Gender',
  'Address', 'Allergies', 'Medical Conditions', 'Notes', 'Created At',
];

interface ParsedRow {
  row: number;
  data: Record<string, any>;
  errors: string[];
}

function normalizeGender(raw: string): string | undefined {
  const v = (raw || '').toLowerCase().trim();
  if (['male', 'm'].includes(v)) return 'male';
  if (['female', 'f'].includes(v)) return 'female';
  if (['other', 'o'].includes(v)) return 'other';
  return undefined;
}

function parseRows(sheetRows: any[][]): { valid: ParsedRow[]; invalid: ParsedRow[] } {
  if (sheetRows.length < 2) return { valid: [], invalid: [] };

  // Normalise header row
  const headers = sheetRows[0].map((h: any) => String(h ?? '').toLowerCase().trim());
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    const mapped = COLUMN_MAP[h];
    if (mapped && !(mapped in colIndex)) colIndex[mapped] = i;
  });

  const valid: ParsedRow[] = [];
  const invalid: ParsedRow[] = [];

  sheetRows.slice(1).forEach((row, idx) => {
    const rowNum = idx + 2; // 1-based, skipping header
    const data: Record<string, any> = {};
    Object.entries(colIndex).forEach(([field, col]) => {
      const raw = row[col] == null ? '' : String(row[col]).trim();
      if (!raw) return;
      if (field === 'ageYears') { const n = Number(raw); if (!isNaN(n)) data[field] = n; }
      else if (field === 'gender') { const g = normalizeGender(raw); if (g) data[field] = g; }
      else if (field === 'allergies' || field === 'medicalConditions') {
        data[field] = raw.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
      }
      else if (field === 'createdAt') {
        // Support date strings and Excel serial numbers
        const d = new Date(raw);
        data[field] = isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      else data[field] = raw;
    });

    const errors: string[] = [];
    REQUIRED_COLUMNS.forEach(f => { if (!data[f]) errors.push(`Missing ${f}`); });

    const parsed: ParsedRow = { row: rowNum, data, errors };
    if (errors.length) invalid.push(parsed);
    else valid.push(parsed);
  });

  return { valid, invalid };
}

export default function ImportPatientsModal({
  onClose, onSuccess,
}: { onClose: () => void; onSuccess: () => void }) {
  const { activeBranch } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed]         = useState<{ valid: ParsedRow[]; invalid: ParsedRow[] } | null>(null);
  const [fileName, setFileName]     = useState('');
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [showCols, setShowCols]     = useState(false);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParsed(null);
    setImportResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb     = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      setParsed(parseRows(rows));
    } catch {
      toast.error('Could not parse file. Make sure it is a valid CSV or Excel file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!parsed || parsed.valid.length === 0) return;
    setImporting(true);
    let imported = 0, failed = 0;
    for (const row of parsed.valid) {
      try {
        await patientsApi.create({
          ...row.data,
          branchId: activeBranch?.id || null,
        });
        imported++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setImportResult({ imported, failed });
    if (imported > 0) {
      toast.success(`${imported} patient${imported !== 1 ? 's' : ''} imported`);
      onSuccess();
    }
    if (failed > 0) toast.error(`${failed} row${failed !== 1 ? 's' : ''} failed`);
  };

  return (
    <motion.div className="fixed inset-0 z-[200] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Import Patients</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">CSV or Excel (.xlsx / .xls)</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={17} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Column guide */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowCols(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
              style={{ background: 'var(--bg-elevated)' }}>
              <span>Expected columns (case-insensitive)</span>
              {showCols ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showCols && (
              <div className="px-4 pb-4 pt-2 flex flex-wrap gap-1.5">
                {SAMPLE_COLUMNS.map(col => (
                  <span key={col} className="px-2 py-0.5 rounded-md text-[11px] font-mono"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {col}
                  </span>
                ))}
                <p className="w-full text-[11px] text-[var(--text-muted)] mt-2">
                  Only <strong>First Name</strong> and <strong>Last Name</strong> are required. Column names are matched case-insensitively.
                  Use <strong>Created At</strong> to backdate old patient records.
                </p>
              </div>
            )}
          </div>

          {/* Drop zone */}
          {!importResult && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <FileSpreadsheet size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-50" />
              {fileName
                ? <p className="text-sm font-medium text-[var(--text-primary)]">{fileName}</p>
                : <p className="text-sm text-[var(--text-muted)]">Drop a file here or <span className="text-brand-400 underline">browse</span></p>}
              <p className="text-xs text-[var(--text-muted)] mt-1">Supports .csv, .xlsx, .xls</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          )}

          {/* Parse summary */}
          {parsed && !importResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-2xl font-bold text-emerald-400">{parsed.valid.length}</p>
                  <p className="text-xs text-emerald-400 mt-0.5">Ready to import</p>
                </div>
                <div className="rounded-xl px-4 py-3 text-center" style={{ background: parsed.invalid.length > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)', border: `1px solid ${parsed.invalid.length > 0 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}` }}>
                  <p className={`text-2xl font-bold ${parsed.invalid.length > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>{parsed.invalid.length}</p>
                  <p className={`text-xs mt-0.5 ${parsed.invalid.length > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>Rows with errors</p>
                </div>
              </div>

              {parsed.invalid.length > 0 && (
                <div>
                  <button type="button" onClick={() => setShowErrors(v => !v)}
                    className="flex items-center gap-2 text-xs text-red-400 mb-2">
                    <AlertCircle size={13} />
                    {showErrors ? 'Hide' : 'Show'} error details ({parsed.invalid.length} rows)
                    {showErrors ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showErrors && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {parsed.invalid.map(r => (
                        <div key={r.row} className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <span className="font-medium text-red-400">Row {r.row}:</span>
                          <span className="text-[var(--text-muted)] ml-1">{r.errors.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setParsed(null); setFileName(''); }} className="btn-secondary flex-1 justify-center">
                  Choose another file
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing || parsed.valid.length === 0}
                  className="btn-primary flex-1 justify-center">
                  {importing
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</span>
                    : `Import ${parsed.valid.length} patient${parsed.valid.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {importResult && (
            <div className="text-center py-6">
              <CheckCircle size={40} className="mx-auto text-emerald-400 mb-3" />
              <p className="font-semibold text-[var(--text-primary)]">Import Complete</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {importResult.imported} imported{importResult.failed > 0 ? `, ${importResult.failed} failed` : ''}
              </p>
              <button type="button" onClick={onClose} className="btn-primary mt-5 px-8">Done</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}