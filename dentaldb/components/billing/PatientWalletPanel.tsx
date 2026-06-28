'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wallet, Plus, CreditCard, ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletApi } from '@/lib/api';

interface Props {
  patientId: string;
  invoiceId?: string;
  invoiceAmount?: number;
}

export default function PatientWalletPanel({ patientId, invoiceId, invoiceAmount }: Props) {
  const [showCredit, setShowCredit]   = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDesc, setCreditDesc]   = useState('');
  const qc = useQueryClient();

  const { data: walletData, isLoading } = useQuery({
    queryKey: ['wallet', patientId],
    queryFn:  () => walletApi.getBalance(patientId).then(r => r.data),
    enabled:  !!patientId,
  });

  const { data: txData } = useQuery({
    queryKey: ['wallet-tx', patientId],
    queryFn:  () => walletApi.getTransactions(patientId, { limit: 5 }).then(r => r.data),
    enabled:  !!patientId,
  });

  const creditMutation = useMutation({
    mutationFn: (d: any) => walletApi.credit(patientId, d),
    onSuccess: () => {
      toast.success('Funds added to wallet');
      setShowCredit(false); setCreditAmount(''); setCreditDesc('');
      qc.invalidateQueries({ queryKey: ['wallet', patientId] });
      qc.invalidateQueries({ queryKey: ['wallet-tx', patientId] });
    },
    onError: () => toast.error('Failed to add funds'),
  });

  const applyMutation = useMutation({
    mutationFn: (d: any) => walletApi.applyToInvoice(patientId, d),
    onSuccess: () => {
      toast.success('Wallet payment applied');
      qc.invalidateQueries({ queryKey: ['wallet', patientId] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Insufficient balance'),
  });

  const balance = Number((walletData as any)?.balance ?? 0);
  const txs     = (txData as any)?.data ?? [];

  if (isLoading) return null;

  return (
    <div className="rounded-xl space-y-3 p-4"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(2,124,198,0.12)', border: '1px solid rgba(2,124,198,0.2)' }}>
            <Wallet size={14} className="text-brand-400" />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Patient Wallet</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Balance</p>
          <span className={`text-base font-bold ${balance > 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
            NPR {balance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowCredit(!showCredit)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium transition-all"
          style={{
            background: showCredit ? 'rgba(2,124,198,0.15)' : 'rgba(2,124,198,0.08)',
            border: '1px solid rgba(2,124,198,0.2)',
            color: 'var(--brand-lt)',
          }}
        >
          <Plus size={13} /> Add Funds
        </button>

        {invoiceId && balance > 0 && (
          <button
            onClick={() => applyMutation.mutate({ invoiceId, amount: Math.min(balance, invoiceAmount ?? balance) })}
            disabled={applyMutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium transition-all disabled:opacity-60"
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: '#10b981',
            }}
          >
            {applyMutation.isPending
              ? <Loader2 size={13} className="animate-spin" />
              : <CreditCard size={13} />}
            Apply to Invoice
          </button>
        )}
      </div>

      {/* Add funds form */}
      {showCredit && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2 overflow-hidden"
        >
          <input
            type="number" min="1" value={creditAmount}
            onChange={e => setCreditAmount(e.target.value)}
            placeholder="Amount (NPR)"
            className="w-full rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
            style={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border)',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(2,124,198,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <input
            value={creditDesc}
            onChange={e => setCreditDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
            style={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border)',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(2,124,198,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            disabled={!creditAmount || creditMutation.isPending}
            onClick={() => creditMutation.mutate({ amount: Number(creditAmount), description: creditDesc || 'Manual credit' })}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--brand)' }}
          >
            {creditMutation.isPending && <Loader2 size={13} className="animate-spin" />}
            Add Funds
          </button>
        </motion.div>
      )}

      {/* Recent transactions */}
      {txs.length > 0 && (
        <div className="space-y-1 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] pt-2 mb-2">
            Recent Transactions
          </p>
          {txs.map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between py-1.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'credit'
                    ? 'bg-emerald-500/10'
                    : 'bg-red-500/10'
                }`}>
                  {tx.type === 'credit'
                    ? <ArrowDownLeft size={11} className="text-emerald-400" />
                    : <ArrowUpRight size={11} className="text-red-400" />}
                </div>
                <span className="text-[var(--text-secondary)] truncate max-w-36">{tx.description}</span>
              </div>
              <span className={`font-semibold flex-shrink-0 ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                {tx.type === 'credit' ? '+' : '-'}NPR {Number(tx.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}