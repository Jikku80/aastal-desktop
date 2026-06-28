'use client';
import { motion } from 'framer-motion';
import { X, CheckCircle, XCircle, ExternalLink, Receipt } from 'lucide-react';
import { useCalendarType } from '@/hooks/useCalendarType';
import { formatDate } from '@/lib/calendar';

const capFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—';

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  approved: { bg: 'rgba(16,185,129,0.10)',  color: '#10b981', border: 'rgba(16,185,129,0.25)' },
  rejected: { bg: 'rgba(239,68,68,0.10)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
};

interface Props {
  expense: any;
  onClose: () => void;
  canApprove: boolean;
  onApprove: (status: string) => void;
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right', maxWidth: 200, wordBreak: 'break-word' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
      {children}
    </p>
  );
}

export default function ExpenseDetailPanel({ expense: e, onClose, canApprove, onApprove }: Props) {
  const calendarType = useCalendarType();
  const status = STATUS_STYLES[e.approvalStatus] ?? STATUS_STYLES.pending;

  console.log('expense details', e);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={ev => ev.target === ev.currentTarget && onClose()}>

      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          height: '100%',
          overflowY: 'auto',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Receipt size={16} style={{ color: '#ef4444' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                {e.description}
              </p>
              <span style={{
                display: 'inline-block', marginTop: 2,
                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: status.bg, color: status.color, border: `1px solid ${status.border}`,
              }}>
                {capFirst(e.approvalStatus)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 6, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Amount */}
          <div style={{ textAlign: 'center', padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              NPR {Number(e.amount).toLocaleString()}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{e.currency ?? 'NPR'}</p>
          </div>

          {/* Details */}
          <div>
            <SectionLabel>Details</SectionLabel>
            <Row label="Category"    value={capFirst(e.category)} />
            <Row label="Date"        value={e.expenseDate ? formatDate(new Date(e.expenseDate), calendarType) : undefined} />
            <Row label="Vendor"      value={e.vendor?.name} />
            <Row label="Reference #" value={e.referenceNumber} />
            <Row label="Recurring"   value={e.isRecurring ? `Every ${e.recurringIntervalDays ?? '?'} days` : 'No'} />
            <Row label="Created By"  value={e.createdByName  ?? e.createdBy} />
            <Row label="Approved By" value={e.approvedByName ?? e.approvedBy} />
          </div>

          {/* Linked sources */}
          {(e.staffId || e.labWorkId || e.purchaseOrderId || e.payrollRunId) && (
            <div>
              <SectionLabel>Linked To</SectionLabel>
              {e.staffId && (
                <Row label="Staff / Dentist" value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, background: 'rgba(99,102,241,0.10)', color: '#6366f1', borderRadius: 6, padding: '2px 8px', fontWeight: 500 }}>
                    👤 {e.staffName ?? e.staffId}
                  </span>
                } />
              )}
              {e.labWorkId && (
                <Row label="Lab Work Order" value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, background: 'rgba(16,185,129,0.10)', color: '#10b981', borderRadius: 6, padding: '2px 8px', fontWeight: 500 }}>
                    🔬 Lab #{e.labWorkId.slice(-6).toUpperCase()}
                  </span>
                } />
              )}
              {e.purchaseOrderId && (
                <Row label="Purchase Order" value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, background: 'rgba(245,158,11,0.10)', color: '#f59e0b', borderRadius: 6, padding: '2px 8px', fontWeight: 500 }}>
                    📦 PO #{e.purchaseOrderId.slice(-6).toUpperCase()}
                  </span>
                } />
              )}
              {e.payrollRunId && (
                <Row label="Payroll Run" value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, background: 'rgba(139,92,246,0.10)', color: '#8b5cf6', borderRadius: 6, padding: '2px 8px', fontWeight: 500 }}>
                    💰 Payroll #{e.payrollRunId.slice(-6).toUpperCase()}
                  </span>
                } />
              )}
            </div>
          )}

          {/* Notes */}
          {e.notes && (
            <div>
              <SectionLabel>Notes</SectionLabel>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6 }}>
                {e.notes}
              </p>
            </div>
          )}

          {/* Receipt link */}
          {e.receiptUrl && (
            <a
              href={e.receiptUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#027cc6', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => ((e.target as HTMLElement).style.textDecoration = 'underline')}
              onMouseLeave={e => ((e.target as HTMLElement).style.textDecoration = 'none')}>
              <ExternalLink size={14} /> View Receipt
            </a>
          )}

          {/* Approval actions */}
          {canApprove && e.approvalStatus === 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionLabel>Approval</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onApprove('approved')}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: 'rgba(16,185,129,0.10)', color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.25)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.18)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.10)')}>
                  <CheckCircle size={15} /> Approve
                </button>
                <button
                  onClick={() => onApprove('rejected')}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: 'rgba(239,68,68,0.10)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.25)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)')}>
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}