'use client';
/**
 * GenericImportModal
 * A reusable file-import modal for CSV / Excel.
 * Pass a `columnMap`, `requiredFields`, and `onImportRow` to customise for
 * appointments, billing, or any other domain.
 */
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export interface ImportColumnSpec {
  /** Lowercase aliases that resolve to this field */
  aliases: string[];
  /** Field key in the output object */
  field: string;
  /** Optional transform applied to the raw cell value */
  transform?: (raw: string) => any;
}

export interface GenericImportModalProps {
  title: string;
  /** Human-friendly column name hints shown in the "Expected columns" section */
  sampleColumns: string[];
  /** Column mapping rules */
  columnSpecs: ImportColumnSpec[];
  /** Fields that must be non-null for a row to be "valid" */
  requiredFields: string[];
  /** Called once per valid parsed row; must throw on failure */
  onImportRow: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  row: number;
  data: Record<string, any>;
  errors: string[];
}

function parseRows(
  sheetRows: any[][],
  columnSpecs: ImportColumnSpec[],
  requiredFields: string[],
): { valid: ParsedRow[]; invalid: ParsedRow[] } {
  if (sheetRows.length < 2) return { valid: [], invalid: [] };

  const headers = sheetRows[0].map((h: any) => String(h ?? '').toLowerCase().trim());

  // Build field → column index map
  const colIndex: Record<string, number> = {};
  columnSpecs.forEach(spec => {
    spec.aliases.forEach(alias => {
      const i = headers.indexOf(alias.toLowerCase());
      if (i !== -1 && !(spec.field in colIndex)) colIndex[spec.field] = i;
    });
  });

  const valid: ParsedRow[] = [];
  const invalid: ParsedRow[] = [];

  sheetRows.slice(1).forEach((row, idx) => {
    const rowNum = idx + 2;
    const data: Record<string, any> = {};

    columnSpecs.forEach(spec => {
      if (!(spec.field in colIndex)) return;
      const raw = row[colIndex[spec.field]] == null ? '' : String(row[colIndex[spec.field]]).trim();
      if (!raw) return;
      data[spec.field] = spec.transform ? spec.transform(raw) : raw;
    });

    const errors: string[] = [];
    requiredFields.forEach(f => { if (!data[f]) errors.push(`Missing ${f}`); });

    const parsed: ParsedRow = { row: rowNum, data, errors };
    if (errors.length) invalid.push(parsed);
    else valid.push(parsed);
  });

  return { valid, invalid };
}

export default function GenericImportModal({
  title, sampleColumns, columnSpecs, requiredFields, onImportRow, onClose, onSuccess,
}: GenericImportModalProps) {
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
      setParsed(parseRows(rows, columnSpecs, requiredFields));
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
      try { await onImportRow(row.data); imported++; }
      catch { failed++; }
    }
    setImporting(false);
    setImportResult({ imported, failed });
    if (imported > 0) { toast.success(`${imported} record${imported !== 1 ? 's' : ''} imported`); onSuccess(); }
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

        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">{title}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">CSV or Excel (.xlsx / .xls)</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={17} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Column guide */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setShowCols(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
              style={{ background: 'var(--bg-elevated)' }}>
              <span>Expected columns (case-insensitive)</span>
              {showCols ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showCols && (
              <div className="px-4 pb-4 pt-2 flex flex-wrap gap-1.5">
                {sampleColumns.map(col => (
                  <span key={col} className="px-2 py-0.5 rounded-md text-[11px] font-mono"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {col}
                  </span>
                ))}
                <p className="w-full text-[11px] text-[var(--text-muted)] mt-2">
                  Required: <strong>{requiredFields.join(', ')}</strong>. All column names are matched case-insensitively.
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
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
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
                        <div key={r.row} className="text-xs px-3 py-2 rounded-lg"
                          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
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
                <button type="button" onClick={handleImport}
                  disabled={importing || parsed.valid.length === 0}
                  className="btn-primary flex-1 justify-center">
                  {importing
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing…</span>
                    : `Import ${parsed.valid.length} record${parsed.valid.length !== 1 ? 's' : ''}`}
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