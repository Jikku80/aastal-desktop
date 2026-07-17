'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Download, CreditCard, CheckCircle, Loader2, Hash, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { billingApi, walletApi } from '@/lib/api';
import { usePermissions } from '@/store/permissions.store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Invoice, PaymentMethod } from '@/types';
import PatientWalletPanel from './PatientWalletPanel';

const PAYMENT_GATEWAYS = [
  { id: 'cash',          label: 'Cash',          emoji: '💵', desc: 'Physical cash' },
  { id: 'esewa',         label: 'eSewa',          emoji: '🟢', desc: 'Digital wallet' },
  { id: 'khalti',        label: 'Khalti',         emoji: '🟣', desc: 'Digital wallet' },
  { id: 'bank_transfer', label: 'Bank Transfer',  emoji: '🏦', desc: 'Direct transfer' },
  { id: 'insurance',     label: 'Insurance',      emoji: '📋', desc: 'Insurance claim' },
  { id: 'paypal',        label: 'PayPal',         emoji: '💙', desc: 'Online payment' },
  // Pays out of the patient's stored wallet balance rather than an external
  // gateway — routed through markPaid()'s 'wallet_debit' branch, which is
  // what actually calls PatientWalletService.debit() and moves the money.
  { id: 'wallet_debit',  label: 'Wallet',         emoji: '👛', desc: "Patient's wallet balance" },
] as const;

export default function InvoiceDetailPanel({
  invoice, onClose, onUpdate,
}: { invoice: Invoice; onClose: () => void; onUpdate: () => void }) {
  const [showPay,  setShowPay]  = useState(false);
  const [gateway,  setGateway]  = useState<PaymentMethod>('cash');
  const [amount,   setAmount]   = useState(String(invoice.dueAmount || invoice.total));
  const [txnId,    setTxnId]    = useState('');
  const [dlState,  setDlState]  = useState<'idle' | 'loading' | 'error'>('idle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { can } = usePermissions();
  const qc = useQueryClient();
  const canDelete = can('invoice.delete');

  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance-pay', invoice.patientId],
    queryFn:  () => walletApi.getBalance(invoice.patientId).then(r => r.data),
    enabled:  !!invoice.patientId,
  });
  const walletBalance     = Number((walletData as any)?.balance ?? 0);
  const walletTooLow      = gateway === 'wallet_debit' && Number(amount) > walletBalance;

  const deleteMutation = useMutation({
    mutationFn: () => billingApi.deleteInvoice(invoice.id),
    onSuccess: () => {
      toast.success('Invoice deleted');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['billing-summary'] });
      onClose();
      onUpdate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  // All gateways record payment locally — no redirects to payment pages.
  // The eSewa/Khalti fields are just used to record which gateway was used
  // and optionally store a manual transaction ID entered by the staff.
  // 'wallet_debit' is the odd one out: markPaid() actually debits the
  // patient's wallet for that method (see BillingService.markPaid), so its
  // success also has to refresh the wallet balance/transactions, not just
  // the invoice-related queries.
  const payMutation = useMutation({
    mutationFn: () =>
      billingApi.markPaid(invoice.id, {
        paymentMethod:   gateway,
        amount:          Number(amount),
        transactionId:   txnId || undefined,
      }),
    onSuccess: () => {
      toast.success(
        gateway === 'wallet_debit' ? 'Paid from patient wallet!' : 'Payment recorded successfully!',
      );
      setShowPay(false);
      // Invalidate commission + dentist performance so they reflect the new payment
      qc.invalidateQueries({ queryKey: ['commissions'] });
      qc.invalidateQueries({ queryKey: ['commissions-chart'] });
      qc.invalidateQueries({ queryKey: ['dentist-performance'] });
      qc.invalidateQueries({ queryKey: ['admin-dentist-performance'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['wallet-balance-pay', invoice.patientId] });
      qc.invalidateQueries({ queryKey: ['wallet', invoice.patientId] });
      qc.invalidateQueries({ queryKey: ['wallet-tx', invoice.patientId] });
      onUpdate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message?.[0] || e.response?.data?.message || 'Payment failed'),
  });

  const handleDownloadPdf = async () => {
    setDlState('loading');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const url     = `${apiBase}/api/v1/billing/invoices/${invoice.id}/pdf`;
      const response = await fetch(url, { method: 'GET', credentials: 'include' });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const contentType = response.headers.get('content-type') || 'application/pdf';
      const isHtml      = contentType.includes('text/html');
      const blob        = await response.blob();
      const typedBlob   = new Blob([blob], { type: isHtml ? 'text/html;charset=utf-8' : 'application/pdf' });
      const objectUrl   = URL.createObjectURL(typedBlob);
      const a           = document.createElement('a');
      a.href = objectUrl;
      a.download = `Invoice-${invoice.invoiceNumber}.${isHtml ? 'html' : 'pdf'}`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      toast.success(isHtml ? 'Invoice saved — print as PDF (Ctrl+P)' : 'PDF downloaded!');
      setDlState('idle');
    } catch (err: any) {
      toast.error('Download failed. Please try again.');
      setDlState('error');
      setTimeout(() => setDlState('idle'), 3000);
    }
  };

  const statusColor: Record<string, string> = {
    paid:           'text-emerald-400 bg-emerald-400/10',
    draft:          'text-gray-400 bg-gray-400/10',
    sent:           'text-blue-400 bg-blue-400/10',
    partially_paid: 'text-amber-400 bg-amber-400/10',
    not_yet_paid:   'text-orange-400 bg-orange-400/10',
    overdue:        'text-red-400 bg-red-400/10',
    cancelled:      'text-gray-500 bg-gray-500/10',
    refunded:       'text-brand-400 bg-brand-400/10',
  };

  const needsTxnId = ['esewa','khalti','bank_transfer','paypal'].includes(gateway);
  const selectedGw = PAYMENT_GATEWAYS.find(g => g.id === gateway);

  return (
    <motion.div
      className="fixed inset-y-0 right-0 w-full sm:w-[460px] z-[200] flex flex-col shadow-2xl"
      style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-2">
            <Hash size={13} className="text-[var(--text-muted)]" />
            {invoice.invoiceNumber}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {invoice.patient?.firstName} {invoice.patient?.lastName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={dlState === 'loading'}
            title="Download PDF"
            className={`btn-ghost text-xs px-3 py-1.5 gap-1.5 ${dlState === 'error' ? 'text-red-400' : ''}`}
          >
            {dlState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {dlState === 'error' ? 'Error' : 'PDF'}
          </button>
          {canDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="btn-ghost w-10 h-10 p-0 justify-center text-red-400 hover:bg-red-400/10 rounded-xl"
              title="Delete invoice">
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={onClose} className="btn-ghost w-10 h-10 p-0 justify-center rounded-xl">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mx-4 mt-3 p-4 rounded-xl shrink-0"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-sm font-medium text-red-400 mb-1">Delete invoice {invoice.invoiceNumber}?</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            This will permanently remove this invoice for <strong className="text-[var(--text-secondary)]">{invoice.patient?.firstName} {invoice.patient?.lastName}</strong>.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1 justify-center text-xs py-1.5">Cancel</button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
              {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
        {/* Amount card */}
        <div className="p-5 rounded-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">
                NPR {Number(invoice.total || 0).toLocaleString()}
              </p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${statusColor[invoice.status] || 'text-gray-400 bg-gray-400/10'}`}>
              {invoice.status?.replace('_', ' ')}
            </span>
          </div>
          {Number(invoice.paidAmount) > 0 && (
            <div className="flex justify-between text-xs mt-2">
              <span className="text-[var(--text-muted)]">Paid</span>
              <span className="text-emerald-400 font-medium">NPR {Number(invoice.paidAmount).toLocaleString()}</span>
            </div>
          )}
          {Number(invoice.dueAmount) > 0 && invoice.status !== 'paid' && (
            <div className="flex justify-between text-xs mt-1">
              <span className="text-[var(--text-muted)]">Outstanding</span>
              <span className="text-amber-400 font-medium">NPR {Number(invoice.dueAmount).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Issued</p>
            <p className="text-sm text-[var(--text-primary)]">
              {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
          {invoice.dueDate && (
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Due Date</p>
              <p className={`text-sm ${new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
              </p>
            </div>
          )}
          {invoice.paymentMethod && (
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Payment</p>
              <p className="text-sm text-[var(--text-primary)] capitalize">
                {invoice.paymentMethod.replace('_', ' ')}
              </p>
            </div>
          )}
          {invoice.paidAt && (
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Paid On</p>
              <p className="text-sm text-emerald-400">
                {format(new Date(invoice.paidAt), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* Line items */}
        {invoice.items?.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-2.5"
              style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Line Items</p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {invoice.items.map((item: any, i: number) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{item.description}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Qty: {item.quantity} × NPR {Number(item.unitPrice).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    NPR {Number(item.total).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 space-y-1"
              style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
              {Number(invoice.taxAmount) > 0 && (
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span>Tax ({invoice.taxPercent}%)</span>
                  <span>NPR {Number(invoice.taxAmount).toLocaleString()}</span>
                </div>
              )}
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Discount</span>
                  <span>− NPR {Number(invoice.discountAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[var(--text-primary)] pt-1"
                style={{ borderTop: '1px solid var(--border)' }}>
                <span>Total</span>
                <span>NPR {Number(invoice.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="p-4 rounded-xl text-sm text-[var(--text-secondary)]"
            style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Notes</p>
            {invoice.notes}
          </div>
        )}

        {/* Patient Wallet — balance + apply-to-invoice only; adding funds now lives on the Patient page.
            Kept inside the same scroll container as the payment footer below (rather than as a
            fixed/pinned section) so that on short viewports or when the payment form is expanded,
            everything — including the Record Payment button — stays reachable by scrolling. */}
        {invoice.patientId && (
          <PatientWalletPanel
            patientId={invoice.patientId}
            invoiceId={invoice.id}
            invoiceAmount={Number(invoice.dueAmount ?? 0)}
            allowAddFunds={false}
          />
        )}

        {/* Payment footer */}
        <div className="pt-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <>
            {!showPay ? (
              <button onClick={() => setShowPay(true)} className="btn-primary w-full justify-center py-3">
                <CreditCard size={15} /> Record Payment
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Select Payment Method
                </p>

                {/* Gateway picker */}
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_GATEWAYS.map(gw => (
                    <button key={gw.id}
                      onClick={() => setGateway(gw.id as PaymentMethod)}
                      className={`p-2.5 rounded-xl text-xs font-medium text-center transition-all flex flex-col items-center gap-1 ${
                        gateway === gw.id
                          ? 'border-brand-500/60 bg-brand-500/10 text-brand-400'
                          : 'text-[var(--text-secondary)] hover:bg-white/5'
                      }`}
                      style={{ border: `1px solid ${gateway === gw.id ? 'rgba(14,157,232,0.4)' : 'var(--border)'}` }}>
                      <span className="text-base">{gw.emoji}</span>
                      <span>{gw.label}</span>
                    </button>
                  ))}
                </div>

                {/* Selected method info */}
                {selectedGw && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{ background: 'rgba(14,157,232,0.06)', border: '1px solid rgba(14,157,232,0.15)' }}>
                    <span>{selectedGw.emoji}</span>
                    <span className="text-brand-400 font-medium">{selectedGw.label}</span>
                    <span className="text-[var(--text-muted)]">— {selectedGw.desc}</span>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="label">Amount (NPR)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input w-full"
                    min="1"
                  />
                  {gateway === 'wallet_debit' && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Wallet balance: <span className="text-[var(--text-primary)] font-medium">NPR {walletBalance.toLocaleString()}</span>
                    </p>
                  )}
                  {walletTooLow && (
                    <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-2">
                      <span>
                        Wallet balance (NPR {walletBalance.toLocaleString()}) is less than NPR {Number(amount || 0).toLocaleString()}.
                        Reduce the amount or add funds to this patient's wallet first.
                      </span>
                    </div>
                  )}
                </div>

                {/* Optional transaction ID for digital payments */}
                {needsTxnId && (
                  <div>
                    <label className="label">
                      Transaction ID
                      <span className="ml-1 text-[var(--text-muted)] font-normal normal-case">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={txnId}
                      onChange={e => setTxnId(e.target.value)}
                      className="input w-full"
                      placeholder="e.g. TXN-123456"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => { setShowPay(false); setTxnId(''); }}
                    className="btn-secondary flex-1 justify-center">
                    Cancel
                  </button>
                  <button
                    onClick={() => payMutation.mutate()}
                    disabled={payMutation.isPending || !amount || Number(amount) <= 0 || walletTooLow}
                    className="btn-primary flex-1 justify-center">
                    {payMutation.isPending
                      ? <Loader2 size={14} className="animate-spin" />
                      : <><CheckCircle size={14} /> Record Payment</>}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {invoice.status === 'paid' && (
          <div className="flex items-center justify-center gap-2 py-3 text-emerald-400">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Paid in full</span>
          </div>
        )}
        </div>
      </div>
    </motion.div>
  );
}