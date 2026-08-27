'use client';
import { useState, Fragment } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, Download, RefreshCw, Lock, Unlock, ChevronRight, ChevronDown, BookOpen, X,
  Landmark, Scale, TrendingUp, Wallet, Folder,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { financeApi, billingApi, expenseApi } from '@/lib/api';
import { useCalendarType } from '@/hooks/useCalendarType';
import { formatDate } from '@/lib/calendar';
import { downloadFinanceStatementPdf } from '@/lib/FinancePdf';
import Header from '@/components/layout/Header';
import PermissionGate from '@/components/rbac/PermissionGate';
import { usePermissionsStore } from '@/store/permissions.store';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth.store';
import { BSDateField } from '@/components/ui/BSDateField';

const TABS = ['Overview', 'Chart of Accounts', 'Journal', 'Trial Balance', 'Balance Sheet', 'Profit & Loss', 'Cash Flow', 'Periods'];

// Enterprise-register palette: numbers carry the meaning, color is reserved
// for genuine status (balanced/unbalanced, positive/negative) rather than
// decoration. Kept intentionally small and muted.
const INK      = 'var(--text-primary)';
const MUTED    = 'var(--text-muted)';
const POSITIVE = '#3f8f6f';   // muted green — favorable
const NEGATIVE = '#c14545';   // muted red — unfavorable / liability
const ACCENT   = '#3a6ea5';   // muted slate blue — neutral emphasis

const round2 = (v: number) => Math.round(v * 100) / 100;
const fmtNPR = (v: any) => `NPR ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Standard accounting convention: negatives in parentheses rather than a minus sign.
const fmtSigned = (v: any) => {
  const n = Number(v ?? 0);
  return n < 0 ? `(${fmtNPR(Math.abs(n))})` : fmtNPR(n);
};

// ── Design tokens (matches app/(app)/dashboard/reports/page.tsx) ──────────────
const surface: React.CSSProperties  = { background: 'var(--bg-surface)',  border: '1px solid var(--border)', borderRadius: '12px' };
const elevated: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' };

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{children}</p>
      {right}
    </div>
  );
}
function ThemedTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...surface, overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>{children}</table>
    </div>
  );
}
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ textAlign: right ? 'right' : 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
}
function Td({ children, style, right, colSpan }: { children: React.ReactNode; style?: React.CSSProperties; right?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{ padding: '11px 16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', textAlign: right ? 'right' : 'left', fontVariantNumeric: 'tabular-nums', ...style }}>
      {children}
    </td>
  );
}
// A section header row spanning the full table width — groups a statement
// into its accounting sections (Assets / Liabilities / Equity, etc.) the
// way a printed financial statement does, instead of separate floating cards.
function StatementSectionRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{
        padding: '9px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)',
      }}>
        {label}
      </td>
    </tr>
  );
}
// A single professional statement table: one or more labeled sections (each
// with line items + a subtotal), optionally followed by a grand-total row.
// Used for Balance Sheet, Profit & Loss, and Cash Flow so every financial
// statement in the module reads like a real accounting document.
function StatementTable({
  sections, grandTotal, emptyLabel = 'No activity',
}: {
  sections: { title: string; rows: { accountId?: string; code?: string; name: string; balance: number }[]; total: number; color?: string }[];
  grandTotal?: { label: string; value: number; color?: string };
  emptyLabel?: string;
}) {
  return (
    <ThemedTable>
      <thead><tr>{['Code', 'Account', 'Amount'].map(h => <Th key={h} right={h === 'Amount'}>{h}</Th>)}</tr></thead>
      <tbody>
        {sections.map(sec => (
          <Fragment key={sec.title}>
            <StatementSectionRow label={sec.title} colSpan={3} />
            {sec.rows.map((r, i) => (
              <tr key={r.accountId ?? `${sec.title}-${i}`}>
                <Td style={{ fontFamily: 'monospace', color: MUTED, fontSize: 12 }}>{r.code ?? ''}</Td>
                <Td style={{ paddingLeft: 28, color: 'var(--text-secondary)' }}>{r.name}</Td>
                <Td right>{fmtNPR(r.balance)}</Td>
              </tr>
            ))}
            {sec.rows.length === 0 && (
              <tr><Td colSpan={3} style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{emptyLabel}</Td></tr>
            )}
            <tr>
              <Td style={{ fontWeight: 700 }}>Total {sec.title}</Td>
              <Td right style={{ fontWeight: 700, color: sec.color ?? INK, borderBottom: '2px solid var(--border)' }}>{fmtNPR(sec.total)}</Td>
            </tr>
          </Fragment>
        ))}
        {grandTotal && (
          <tr>
            <Td style={{ fontWeight: 800 }}>{grandTotal.label}</Td>
            <Td right style={{ fontWeight: 800, fontSize: 14, color: grandTotal.color ?? INK }}>{fmtNPR(grandTotal.value)}</Td>
          </tr>
        )}
      </tbody>
    </ThemedTable>
  );
}
function Btn({ children, onClick, variant = 'default', disabled }: any) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    primary: { background: '#027cc6', color: '#fff', border: '1px solid #027cc6' },
    danger:  { background: 'rgba(239,68,68,0.1)', color: NEGATIVE, border: '1px solid rgba(239,68,68,0.25)' },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...styles[variant] }}>
      {children}
    </button>
  );
}
function DateInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>}
      <BSDateField value={value} onChange={onChange} className="input" />
    </label>
  );
}

// ── Overview: enterprise summary + drill-down entry point ─────────────────────
function lastNMonths(n: number) {
  const out: { key: string; label: string; from: string; to: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: 'short' }), from, to });
  }
  return out;
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div style={{ ...surface, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
          <p style={{ fontSize: 21, fontWeight: 700, marginTop: 4, color: tone ?? INK, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
          {sub && <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</p>}
        </div>
        <Icon size={17} style={{ color: MUTED, opacity: 0.7 }} />
      </div>
    </div>
  );
}

function OverviewTab({ onDrillToAccounts }: { onDrillToAccounts: () => void }) {
  const { activeBranch } = useAuthStore();
  const branchId = activeBranch?.id;
  const months = lastNMonths(6);
  const todayStr = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const { data: bs } = useQuery({
    queryKey: ['finance-overview-bs', todayStr, branchId],
    queryFn: () => financeApi.getBalanceSheet({ asOfDate: todayStr, branchId }).then(r => r.data),
  });
  const { data: plYtd } = useQuery({
    queryKey: ['finance-overview-pl-ytd', yearStart, todayStr, branchId],
    queryFn: () => financeApi.getProfitLoss({ dateFrom: yearStart, dateTo: todayStr, branchId }).then(r => r.data),
  });
  const { data: cfYtd } = useQuery({
    queryKey: ['finance-overview-cf-ytd', yearStart, todayStr, branchId],
    queryFn: () => financeApi.getCashFlow({ dateFrom: yearStart, dateTo: todayStr, branchId }).then(r => r.data),
  });

  const monthlyPl = useQueries({
    queries: months.map(m => ({
      queryKey: ['finance-overview-pl-month', m.key, branchId],
      queryFn: () => financeApi.getProfitLoss({ dateFrom: m.from, dateTo: m.to, branchId }).then(r => r.data),
    })),
  });
  const monthlyCf = useQueries({
    queries: months.map(m => ({
      queryKey: ['finance-overview-cf-month', m.key, branchId],
      queryFn: () => financeApi.getCashFlow({ dateFrom: m.from, dateTo: m.to, branchId }).then(r => r.data),
    })),
  });

  const trendData = months.map((m, i) => ({
    month: m.label,
    revenue: Number(monthlyPl[i]?.data?.totalRevenue ?? 0),
    expense: Number(monthlyPl[i]?.data?.totalExpenses ?? 0),
  }));
  const cashData = months.map((m, i) => ({
    month: m.label,
    net: Number(monthlyCf[i]?.data?.netCashFlow ?? 0),
  }));

  const tooltipStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, color: INK, fontSize: 12 };
  const isLoadingTrends = monthlyPl.some(q => q.isLoading) || monthlyCf.some(q => q.isLoading);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} className="lg:grid-cols-4">
        <StatCard icon={Landmark}   label="Total Assets"      value={fmtNPR(bs?.totalAssets)}      sub="as of today" />
        <StatCard icon={Scale}      label="Total Liabilities" value={fmtNPR(bs?.totalLiabilities)} sub="as of today" tone={Number(bs?.totalLiabilities) > 0 ? NEGATIVE : INK} />
        <StatCard icon={TrendingUp} label="Net Income (YTD)"  value={fmtSigned(plYtd?.netIncome)}  sub={`since Jan ${new Date().getFullYear()}`} tone={Number(plYtd?.netIncome) >= 0 ? POSITIVE : NEGATIVE} />
        <StatCard icon={Wallet}     label="Cash Position"     value={fmtNPR(cfYtd?.closingBalance)} sub="closing balance, YTD" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="lg:grid-cols-2">
        <div style={{ ...surface, padding: 20 }}>
          <SectionTitle>Revenue vs. Expense — last 6 months</SectionTitle>
          {isLoadingTrends ? (
            <p style={{ fontSize: 12, color: MUTED, padding: '24px 0', textAlign: 'center' }}>Loading…</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={54} />
                <Tooltip formatter={(v: any, k: any) => [fmtNPR(v), k === 'revenue' ? 'Revenue' : 'Expense']} contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" fill={ACCENT} radius={[3, 3, 0, 0]} maxBarSize={22} name="Revenue" />
                <Bar dataKey="expense" fill="#9a9a9a" radius={[3, 3, 0, 0]} maxBarSize={22} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={{ ...surface, padding: 20 }}>
          <SectionTitle>Net Cash Flow — last 6 months</SectionTitle>
          {isLoadingTrends ? (
            <p style={{ fontSize: 12, color: MUTED, padding: '24px 0', textAlign: 'center' }}>Loading…</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cashData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={54} />
                <Tooltip formatter={(v: any) => [fmtNPR(v), 'Net Cash Flow']} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="net" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ ...surface, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <p style={{ fontSize: 12, color: MUTED }}>
          {bs?.isBalanced === false
            ? 'The ledger is currently out of balance — check the trial balance for details.'
            : 'Books are balanced as of today.'}
        </p>
        <Btn onClick={onDrillToAccounts}><Folder size={13} /> Browse Chart of Accounts</Btn>
      </div>
    </div>
  );
}

// ── Tab 1: Chart of Accounts ──────────────────────────────────────────────────
// Shared ledger drill-down — reached from the account tree (COA tab) or by
// clicking an account inline in the Journal tab. One implementation, two
// entry points, per the "reuse, don't duplicate" rule.
function AccountLedgerDrilldown({ account, onBack }: { account: any; onBack: () => void }) {
  const calendarType = useCalendarType();
  const { activeBranch } = useAuthStore();
  const branchId = activeBranch?.id;
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo]     = useState(now.toISOString().split('T')[0]);

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['finance-ledger', account.id, from, to, branchId],
    queryFn: () => financeApi.getLedger(account.id, { dateFrom: from, dateTo: to, branchId }).then(r => r.data),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <Btn onClick={onBack}>← Back</Btn>
        <div style={{ display: 'flex', gap: 10 }}>
          <DateInput label="From" value={from} onChange={setFrom} />
          <DateInput label="To" value={to} onChange={setTo} />
        </div>
      </div>
      <SectionTitle>
        <span style={{ fontFamily: 'monospace', color: MUTED, marginRight: 8 }}>{account.code}</span>
        {account.name}
      </SectionTitle>
      <ThemedTable>
        <thead><tr>{['Date', 'Memo', 'Description', 'Debit', 'Credit', 'Running Balance'].map(h => <Th key={h} right={h === 'Debit' || h === 'Credit' || h === 'Running Balance'}>{h}</Th>)}</tr></thead>
        <tbody>
          {(ledger?.entries ?? []).map((e: any) => (
            <tr key={e.id}>
              <Td>{formatDate(new Date(e.date), calendarType)}</Td>
              <Td>{e.memo}</Td>
              <Td style={{ color: MUTED }}>{e.description ?? '—'}</Td>
              <Td right>{e.debit > 0 ? fmtNPR(e.debit) : ''}</Td>
              <Td right>{e.credit > 0 ? fmtNPR(e.credit) : ''}</Td>
              <Td right style={{ fontWeight: 600 }}>{fmtNPR(e.runningBalance)}</Td>
            </tr>
          ))}
          {!isLoading && (!ledger?.entries || ledger.entries.length === 0) && (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: MUTED, fontSize: 12 }}>No activity in this range</td></tr>
          )}
        </tbody>
      </ThemedTable>
    </div>
  );
}

const ACCOUNT_TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  asset: 'Assets', liability: 'Liabilities', equity: 'Equity', revenue: 'Revenue', expense: 'Expenses',
};

// Tab 1: Chart of Accounts — an account tree (grouped by type, expand/collapse)
// rather than a flat table, so drilling from COA → account → ledger reads the
// way real accounting software (QuickBooks/Xero/Zoho) is laid out.
function ChartOfAccountsTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'expense', description: '' });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drilldown, setDrilldown] = useState<any>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => financeApi.listAccounts().then(r => r.data),
  });
  const rows = Array.isArray(data) ? data : [];

  const seedMutation = useMutation({
    mutationFn: () => financeApi.seedCoa(),
    onSuccess: () => { toast.success('Default chart of accounts seeded'); qc.invalidateQueries({ queryKey: ['finance-accounts'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to seed COA'),
  });
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const [billing, expenses] = await Promise.all([
        billingApi.reconcileFinance().then(r => r.data),
        expenseApi.reconcileFinance().then(r => r.data),
      ]);
      return { billing, expenses };
    },
    onSuccess: ({ billing, expenses }) => {
      const posted = (billing?.posted ?? 0) + (expenses?.posted ?? 0);
      toast.success(
        posted > 0
          ? `Posted ${posted} journal ${posted === 1 ? 'entry' : 'entries'} from existing billing & expense records`
          : 'Everything is already reflected in the ledger — nothing to sync',
      );
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      qc.invalidateQueries({ queryKey: ['finance-entries'] });
      qc.invalidateQueries({ predicate: q => typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith('finance-') });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to sync from billing & expenses'),
  });
  const createMutation = useMutation({
    mutationFn: () => financeApi.createAccount(form),
    onSuccess: () => {
      toast.success('Account created');
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      setShowForm(false);
      setForm({ code: '', name: '', type: 'expense', description: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create account'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteAccount(id),
    onSuccess: () => { toast.success('Account deleted'); qc.invalidateQueries({ queryKey: ['finance-accounts'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete account'),
  });

  if (drilldown) {
    return <AccountLedgerDrilldown account={drilldown} onBack={() => setDrilldown(null)} />;
  }

  const grouped = ACCOUNT_TYPE_ORDER.map(type => ({
    type,
    accounts: rows.filter((a: any) => a.type === type).sort((a: any, b: any) => String(a.code).localeCompare(String(b.code))),
  })).filter(g => g.accounts.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PermissionGate permission="finance.manage_accounts">
          <Btn variant="default" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <RefreshCw size={13} /> Seed Default Accounts
          </Btn>
          <Btn variant="default" onClick={() => reconcileMutation.mutate()} disabled={reconcileMutation.isPending}>
            <RefreshCw size={13} /> Sync from Billing & Expenses
          </Btn>
          <Btn variant="primary" onClick={() => setShowForm(s => !s)}>
            <Plus size={13} /> Add Account
          </Btn>
        </PermissionGate>
      </div>
      <p style={{ fontSize: 11, color: MUTED }}>
        If the ledger looks empty despite existing billing or expense records, use <strong style={{ color: 'var(--text-secondary)' }}>Sync from Billing & Expenses</strong> to post them retroactively — this can happen for records created before the chart of accounts was seeded.
      </p>

      {showForm && (
        <div style={{ ...surface, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle right={<button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED }}><X size={16} /></button>}>New Account</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} className="sm:grid-cols-4">
            <input placeholder="Code (e.g. 5950)" className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <input placeholder="Name" className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
            <input placeholder="Description (optional)" className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Btn variant="primary" onClick={() => createMutation.mutate()} disabled={!form.code || !form.name || createMutation.isPending}>
              Save Account
            </Btn>
          </div>
        </div>
      )}

      <div style={{ ...surface, overflow: 'hidden' }}>
        {grouped.map(({ type, accounts }, gi) => {
          const isCollapsed = !!collapsed[type];
          return (
            <div key={type} style={{ borderBottom: gi < grouped.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <button
                onClick={() => setCollapsed(c => ({ ...c, [type]: !c[type] }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  background: 'var(--bg-elevated)', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                {isCollapsed ? <ChevronRight size={14} color={MUTED} /> : <ChevronDown size={14} color={MUTED} />}
                <Folder size={14} color={MUTED} />
                <span style={{ fontSize: 12, fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {ACCOUNT_TYPE_LABEL[type]}
                </span>
                <span style={{ fontSize: 11, color: MUTED }}>({accounts.length})</span>
              </button>
              {!isCollapsed && accounts.map((a: any) => (
                <div key={a.id}
                  onClick={() => setDrilldown(a)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px 10px 40px',
                    borderTop: '1px solid var(--border)', cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: MUTED, width: 56, flexShrink: 0 }}>{a.code}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: INK, flex: 1 }}>
                    {a.name}
                    {a.isSystem && <span style={{ marginLeft: 6, fontSize: 10, color: MUTED }}>(system)</span>}
                  </span>
                  <span style={{ fontSize: 11, color: MUTED, textTransform: 'capitalize', width: 70, flexShrink: 0 }}>{a.normalBalance}</span>
                  {a.isActive ? (
                    <span style={{ fontSize: 11, color: POSITIVE, width: 60, flexShrink: 0 }}>Active</span>
                  ) : (
                    <span style={{ fontSize: 11, color: MUTED, width: 60, flexShrink: 0 }}>Inactive</span>
                  )}
                  {!a.isSystem ? (
                    <PermissionGate permission="finance.manage_accounts">
                      <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(a.id); }}
                        style={{ fontSize: 11, color: NEGATIVE, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                        Delete
                      </button>
                    </PermissionGate>
                  ) : <span style={{ width: 40, flexShrink: 0 }} />}
                  <ChevronRight size={14} color={MUTED} style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          );
        })}
        {!isLoading && grouped.length === 0 && (
          <p style={{ textAlign: 'center', padding: '32px', color: MUTED, fontSize: 12 }}>
            No accounts yet — seed the default chart of accounts to get started.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Tab 2: Journal (entries list + manual entry + drill into ledger) ─────────
function JournalTab() {
  const calendarType = useCalendarType();
  const { activeBranch } = useAuthStore();
  const branchId = activeBranch?.id;
  const qc = useQueryClient();
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo]     = useState(now.toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [lines, setLines] = useState([{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }]);
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(now.toISOString().split('T')[0]);

  const { data: accounts = [] } = useQuery({ queryKey: ['finance-accounts'], queryFn: () => financeApi.listAccounts().then(r => r.data) });
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['finance-entries', from, to, branchId],
    queryFn: () => financeApi.listEntries({ dateFrom: from, dateTo: to, branchId }).then(r => r.data),
  });

  const postMutation = useMutation({
    mutationFn: () => financeApi.postManual({
      date, memo, branchId,
      lines: lines.filter(l => l.accountId && (l.debit || l.credit)).map(l => ({
        accountId: l.accountId, debit: Number(l.debit || 0), credit: Number(l.credit || 0),
      })),
    }),
    onSuccess: () => {
      toast.success('Journal entry posted');
      qc.invalidateQueries({ queryKey: ['finance-entries'] });
      setShowForm(false);
      setLines([{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }]);
      setMemo('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to post entry — check debits equal credits'),
  });

  const rows = Array.isArray(entries) ? entries : [];
  const accountList = Array.isArray(accounts) ? accounts : [];

  const totalDebit  = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  if (selectedAccount) {
    const acc = accountList.find((a: any) => a.id === selectedAccount);
    return <AccountLedgerDrilldown account={acc ?? { id: selectedAccount, code: '', name: '' }} onBack={() => setSelectedAccount(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <DateInput label="From" value={from} onChange={setFrom} />
          <DateInput label="To" value={to} onChange={setTo} />
        </div>
        <PermissionGate permission="finance.post_journal_entry">
          <Btn variant="primary" onClick={() => setShowForm(s => !s)}><Plus size={13} /> Manual Entry</Btn>
        </PermissionGate>
      </div>

      {showForm && (
        <div style={{ ...surface, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle right={<button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>}>New Manual Journal Entry</SectionTitle>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <DateInput label="Date" value={date} onChange={setDate} />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Memo</span>
              <input className="input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="e.g. Owner capital contribution" />
            </label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <select className="input" value={l.accountId} onChange={e => {
                  const next = [...lines]; next[i] = { ...next[i], accountId: e.target.value }; setLines(next);
                }}>
                  <option value="">Select account…</option>
                  {accountList.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                <input className="input" type="number" placeholder="Debit" value={l.debit}
                  onChange={e => { const next = [...lines]; next[i] = { ...next[i], debit: e.target.value, credit: '' }; setLines(next); }} />
                <input className="input" type="number" placeholder="Credit" value={l.credit}
                  onChange={e => { const next = [...lines]; next[i] = { ...next[i], credit: e.target.value, debit: '' }; setLines(next); }} />
                <button onClick={() => setLines(lines.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div>
            <button onClick={() => setLines([...lines, { accountId: '', debit: '', credit: '' }])}
              style={{ fontSize: 12, color: '#027cc6', background: 'none', border: 'none', cursor: 'pointer' }}>
              + Add line
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
            <span>Total Debit: <strong>{fmtNPR(totalDebit)}</strong></span>
            <span>Total Credit: <strong>{fmtNPR(totalCredit)}</strong></span>
            <span style={{ color: totalDebit === totalCredit && totalDebit > 0 ? POSITIVE : NEGATIVE }}>
              {totalDebit === totalCredit && totalDebit > 0 ? 'Balanced ✓' : 'Not balanced'}
            </span>
          </div>
          <div>
            <Btn variant="primary" onClick={() => postMutation.mutate()}
              disabled={totalDebit !== totalCredit || totalDebit === 0 || !memo || postMutation.isPending}>
              Post Entry
            </Btn>
          </div>
        </div>
      )}

      <ThemedTable>
        <thead><tr>{['Date', 'Memo', 'Source', 'Posted By', 'Lines'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
        <tbody>
          {rows.map((e: any) => (
            <tr key={e.id}>
              <Td>{formatDate(new Date(e.date), calendarType)}</Td>
              <Td style={{ fontWeight: 600 }}>{e.memo}</Td>
              <Td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{e.sourceType?.replace(/_/g, ' ')}</span></Td>
              <Td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.postedBy}</Td>
              <Td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(e.lines ?? []).map((l: any) => (
                    <span key={l.id} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      <button onClick={() => setSelectedAccount(l.accountId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#027cc6', padding: 0 }}>
                        {l.account?.code} {l.account?.name}
                      </button>
                      {' '}{l.debit > 0 ? `Dr ${fmtNPR(l.debit)}` : `Cr ${fmtNPR(l.credit)}`}
                    </span>
                  ))}
                </div>
              </Td>
            </tr>
          ))}
          {!isLoading && rows.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 12 }}>No journal entries in this range</td></tr>
          )}
        </tbody>
      </ThemedTable>
    </div>
  );
}

// ── Tab 3: Trial Balance ──────────────────────────────────────────────────────
function TrialBalanceTab() {
  const calendarType = useCalendarType();
  const { activeBranch } = useAuthStore();
  const branchId = activeBranch?.id;
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const { data, isLoading } = useQuery({
    queryKey: ['trial-balance', asOf, branchId],
    queryFn: () => financeApi.getTrialBalance({ dateTo: asOf, branchId }).then(r => r.data),
  });
  const rows = data?.rows ?? [];

  const handleDownload = async () => {
    try {
      await downloadFinanceStatementPdf(financeApi.getTrialBalancePdfUrl({ dateTo: asOf, branchId }), 'Trial-Balance.pdf');
    } catch { toast.error('Download failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <DateInput label="As of" value={asOf} onChange={setAsOf} />
        <Btn onClick={handleDownload}><Download size={13} /> Download PDF</Btn>
      </div>
      {isLoading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p> : (
        <>
          <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <span style={{ padding: '4px 10px', borderRadius: 6, background: data?.isBalanced ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: data?.isBalanced ? POSITIVE : NEGATIVE, border: `1px solid ${data?.isBalanced ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
              {data?.isBalanced ? 'Balanced ✓' : 'Out of balance'}
            </span>
          </div>
          <ThemedTable>
            <thead><tr>{['Code', 'Account', 'Type', 'Debit', 'Credit'].map(h => <Th key={h} right={h === 'Debit' || h === 'Credit'}>{h}</Th>)}</tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.accountId}>
                  <Td style={{ fontFamily: 'monospace' }}>{r.code}</Td>
                  <Td style={{ fontWeight: 600 }}>{r.name}</Td>
                  <Td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{r.type}</Td>
                  <Td right>{r.debit > 0 ? fmtNPR(r.debit) : ''}</Td>
                  <Td right>{r.credit > 0 ? fmtNPR(r.credit) : ''}</Td>
                </tr>
              ))}
              <tr>
                {/* <Td style={{ fontWeight: 700 }} />                <Td /> */}
                <Td style={{ fontWeight: 700 }}>Total</Td>
                <Td right style={{ fontWeight: 700 }}>{fmtNPR(data?.totalDebit)}</Td>
                <Td right style={{ fontWeight: 700 }}>{fmtNPR(data?.totalCredit)}</Td>
              </tr>
              {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 12 }}>No accounts to show</td></tr>}
            </tbody>
          </ThemedTable>
        </>
      )}
    </div>
  );
}

// ── Tab 4: Balance Sheet ──────────────────────────────────────────────────────
function BalanceSheetTab() {
  const { activeBranch } = useAuthStore();
  const branchId = activeBranch?.id;
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const { data, isLoading } = useQuery({
    queryKey: ['balance-sheet', asOf, branchId],
    queryFn: () => financeApi.getBalanceSheet({ asOfDate: asOf, branchId }).then(r => r.data),
  });

  const handleDownload = async () => {
    try {
      await downloadFinanceStatementPdf(financeApi.getBalanceSheetPdfUrl({ asOfDate: asOf, branchId }), 'Balance-Sheet.pdf');
    } catch { toast.error('Download failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <DateInput label="As of" value={asOf} onChange={setAsOf} />
        <Btn onClick={handleDownload}><Download size={13} /> Download PDF</Btn>
      </div>
      {isLoading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p> : !data ? null : (
        <>
          <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <span style={{ padding: '4px 10px', borderRadius: 6, background: data.isBalanced ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: data.isBalanced ? POSITIVE : NEGATIVE, border: `1px solid ${data.isBalanced ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
              {data.isBalanced ? 'Assets = Liabilities + Equity ✓' : 'Out of balance'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} className="lg:grid-cols-3">
            <div style={{ ...elevated, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Assets</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: POSITIVE }}>{fmtNPR(data.totalAssets)}</p>
            </div>
            <div style={{ ...elevated, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Liabilities</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: NEGATIVE }}>{fmtNPR(data.totalLiabilities)}</p>
            </div>
            <div style={{ ...elevated, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Equity (incl. net income to date)</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: ACCENT }}>{fmtNPR(data.totalEquity)}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="lg:grid-cols-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionTitle>Assets</SectionTitle>
              <StatementTable
                sections={[{ title: 'Assets', rows: data.assets, total: data.totalAssets, color: POSITIVE }]}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionTitle>Liabilities &amp; Equity</SectionTitle>
              <StatementTable
                sections={[
                  { title: 'Liabilities', rows: data.liabilities, total: data.totalLiabilities, color: NEGATIVE },
                  { title: 'Equity', rows: data.equity, total: data.totalEquity, color: ACCENT },
                ]}
                grandTotal={{ label: 'Total Liabilities & Equity', value: round2(data.totalLiabilities + data.totalEquity), color: ACCENT }}
              />
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Net income accumulated to date ({fmtNPR(data.netIncomeToDate)}) is rolled into Owner's Equity above.
          </p>
        </>
      )}
    </div>
  );
}

// ── Tab 5: Profit & Loss ──────────────────────────────────────────────────────
function ProfitLossTab() {
  const { activeBranch } = useAuthStore();
  const branchId = activeBranch?.id;
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo]     = useState(now.toISOString().split('T')[0]);
  const { data, isLoading } = useQuery({
    queryKey: ['finance-pl', from, to, branchId],
    queryFn: () => financeApi.getProfitLoss({ dateFrom: from, dateTo: to, branchId }).then(r => r.data),
    enabled: !!from && !!to,
  });

  const handleDownload = async () => {
    try {
      await downloadFinanceStatementPdf(financeApi.getProfitLossPdfUrl({ dateFrom: from, dateTo: to, branchId }), 'Profit-And-Loss.pdf');
    } catch { toast.error('Download failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <DateInput label="From" value={from} onChange={setFrom} />
          <DateInput label="To" value={to} onChange={setTo} />
        </div>
        <Btn onClick={handleDownload}><Download size={13} /> Download PDF</Btn>
      </div>
      {isLoading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p> : !data ? null : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} className="lg:grid-cols-3">
            <div style={{ ...elevated, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Revenue</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: POSITIVE }}>{fmtNPR(data.totalRevenue)}</p>
            </div>
            <div style={{ ...elevated, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Expenses</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: NEGATIVE }}>{fmtNPR(data.totalExpenses)}</p>
            </div>
            <div style={{ ...elevated, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Income</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: data.netIncome >= 0 ? POSITIVE : NEGATIVE }}>{fmtNPR(data.netIncome)}</p>
            </div>
          </div>
          <StatementTable
            sections={[
              { title: 'Revenue', rows: data.revenue, total: data.totalRevenue, color: POSITIVE },
              { title: 'Expenses', rows: data.expenses, total: data.totalExpenses, color: NEGATIVE },
            ]}
            grandTotal={{ label: 'Net Income', value: data.netIncome, color: data.netIncome >= 0 ? POSITIVE : NEGATIVE }}
          />
        </>
      )}
    </div>
  );
}

// ── Tab 6: Cash Flow ──────────────────────────────────────────────────────────
function CashFlowTab() {
  const { activeBranch } = useAuthStore();
  const branchId = activeBranch?.id;
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo]     = useState(now.toISOString().split('T')[0]);
  const { data, isLoading } = useQuery({
    queryKey: ['finance-cashflow', from, to, branchId],
    queryFn: () => financeApi.getCashFlow({ dateFrom: from, dateTo: to, branchId }).then(r => r.data),
    enabled: !!from && !!to,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <DateInput label="From" value={from} onChange={setFrom} />
        <DateInput label="To" value={to} onChange={setTo} />
      </div>
      {isLoading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p> : !data ? null : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} className="lg:grid-cols-3">
            <div style={{ ...elevated, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opening Balance</p>
              <p style={{ fontSize: 18, fontWeight: 700 }}>{fmtNPR(data.openingBalance)}</p>
            </div>
            <div style={{ ...elevated, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Closing Balance</p>
              <p style={{ fontSize: 18, fontWeight: 700 }}>{fmtNPR(data.closingBalance)}</p>
            </div>
            <div style={{ ...elevated, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Cash Flow</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: data.netCashFlow >= 0 ? POSITIVE : NEGATIVE }}>{fmtNPR(data.netCashFlow)}</p>
            </div>
          </div>
          <SectionTitle>Operating Activities by Source</SectionTitle>
          <ThemedTable>
            <thead><tr>{['Source', 'Net Amount'].map(h => <Th key={h} right={h === 'Net Amount'}>{h}</Th>)}</tr></thead>
            <tbody>
              {(data.operatingActivities ?? []).map((a: any) => (
                <tr key={a.sourceType}>
                  <Td style={{ textTransform: 'capitalize' }}>{a.sourceType.replace(/_/g, ' ')}</Td>
                  <Td right style={{ color: a.netAmount >= 0 ? POSITIVE : NEGATIVE, fontWeight: 600 }}>{fmtNPR(a.netAmount)}</Td>
                </tr>
              ))}
              {(!data.operatingActivities || data.operatingActivities.length === 0) && (
                <tr><Td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No cash activity in this range</Td></tr>
              )}
              <tr>
                <Td style={{ fontWeight: 800 }}>Net Cash Flow</Td>
                <Td right style={{ fontWeight: 800, fontSize: 14, color: data.netCashFlow >= 0 ? POSITIVE : NEGATIVE }}>{fmtNPR(data.netCashFlow)}</Td>
              </tr>
            </tbody>
          </ThemedTable>
        </>
      )}
    </div>
  );
}

// ── Tab 7: Period Close ────────────────────────────────────────────────────────
function PeriodsTab() {
  const calendarType = useCalendarType();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    label: '', startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  });

  const { data = [], isLoading } = useQuery({ queryKey: ['finance-periods'], queryFn: () => financeApi.listPeriods().then(r => r.data) });
  const rows = Array.isArray(data) ? data : [];

  const closeMutation = useMutation({
    mutationFn: () => financeApi.closePeriod(form),
    onSuccess: () => { toast.success('Period closed'); qc.invalidateQueries({ queryKey: ['finance-periods'] }); setShowForm(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to close period'),
  });
  const reopenMutation = useMutation({
    mutationFn: (id: string) => financeApi.reopenPeriod(id),
    onSuccess: () => { toast.success('Period reopened'); qc.invalidateQueries({ queryKey: ['finance-periods'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reopen period'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PermissionGate permission="finance.close_period">
        <div>
          <Btn variant="primary" onClick={() => setShowForm(s => !s)}><Lock size={13} /> Close a Period</Btn>
        </div>
      </PermissionGate>

      {showForm && (
        <div style={{ ...surface, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle right={<button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>}>Close Accounting Period</SectionTitle>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Label</span>
              <input className="input" placeholder="e.g. August 2026" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
            </label>
            <DateInput label="Start Date" value={form.startDate} onChange={v => setForm({ ...form, startDate: v })} />
            <DateInput label="End Date" value={form.endDate} onChange={v => setForm({ ...form, endDate: v })} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Once closed, no new or manual journal entry can be dated inside this range — statements for this period stay stable.
          </p>
          <div>
            <Btn variant="primary" onClick={() => closeMutation.mutate()} disabled={!form.label || closeMutation.isPending}>
              Close Period
            </Btn>
          </div>
        </div>
      )}

      <ThemedTable>
        <thead><tr>{['Label', 'Start', 'End', 'Status', 'Closed By', ''].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
        <tbody>
          {rows.map((p: any) => (
            <tr key={p.id}>
              <Td style={{ fontWeight: 600 }}>{p.label}</Td>
              <Td>{formatDate(new Date(p.startDate), calendarType)}</Td>
              <Td>{formatDate(new Date(p.endDate), calendarType)}</Td>
              <Td>
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: p.status === 'closed' ? NEGATIVE : POSITIVE, background: p.status === 'closed' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>
                  {p.status === 'closed' ? <Lock size={10} style={{ display: 'inline', marginRight: 4 }} /> : <Unlock size={10} style={{ display: 'inline', marginRight: 4 }} />}
                  {p.status}
                </span>
              </Td>
              <Td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.closedBy ?? '—'}</Td>
              <Td>
                {p.status === 'closed' && (
                  <PermissionGate permission="finance.close_period">
                    <button onClick={() => reopenMutation.mutate(p.id)} style={{ fontSize: 12, color: '#027cc6', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Reopen
                    </button>
                  </PermissionGate>
                )}
              </Td>
            </tr>
          ))}
          {!isLoading && rows.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 12 }}>No closed periods yet</td></tr>
          )}
        </tbody>
      </ThemedTable>
    </div>
  );
}

// ── Main Finance Page ─────────────────────────────────────────────────────────
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState(0);
  const calendarType = useCalendarType();

  const TAB_COMPONENTS = [
    <OverviewTab        key="overview" onDrillToAccounts={() => setActiveTab(1)} />,
    <ChartOfAccountsTab key="coa" />,
    <JournalTab         key="journal" />,
    <TrialBalanceTab    key="tb" />,
    <BalanceSheetTab    key="bs" />,
    <ProfitLossTab       key="pl" />,
    <CashFlowTab         key="cf" />,
    <PeriodsTab          key="periods" />,
  ];

  return (
    <PermissionGate permission="finance.view_ledger">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header title="Finance" subtitle="Chart of Accounts, Journal & Financial Statements" />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}
          className="sm:p-6">

          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Dates shown in <strong style={{ color: 'var(--text-secondary)' }}>{calendarType}</strong> calendar (set in clinic settings)
          </p>

          <div style={{
            display: 'flex', gap: 4, padding: 4,
            background: 'var(--bg-elevated)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}>
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setActiveTab(i)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: activeTab === i ? 'var(--bg-surface)' : 'transparent',
                  color: activeTab === i ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === i ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  flexShrink: 0,
                }}>
                {t}
              </button>
            ))}
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}>
            {TAB_COMPONENTS[activeTab]}
          </motion.div>
        </div>
      </div>
    </PermissionGate>
  );
}