'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { Send, Landmark, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { reportsApi } from '@/lib/api';
import { useCalendarType } from '@/hooks/useCalendarType';
import { formatDate } from '@/lib/calendar';
import { BSDateField } from '@/components/ui/BSDateField';
import Header from '@/components/layout/Header';
import PermissionGate from '@/components/rbac/PermissionGate';

const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#f97316','#06b6d4'];
const fmtNPR   = (v: any) => `NPR ${Number(v ?? 0).toLocaleString()}`;
const pct      = (v: any) => `${Number(v ?? 0).toFixed(1)}%`;

const TABS = ['Doctor Performance','Service Revenue','Receivables','Branch Performance'];

// ── Design tokens ─────────────────────────────────────────────────────────────
const surface: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
};
const elevated: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
};
const tooltipStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
};

// ── Date filter bar ───────────────────────────────────────────────────────────
function DateFilter({ from, to, setFrom, setTo }: any) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <BSDateField value={from} onChange={setFrom} className="input" />
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>to</span>
      <BSDateField value={to} onChange={setTo} className="input" />
    </div>
  );
}

// ── Stat card (reused in multiple tabs) ──────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div style={{ ...elevated, padding: '16px', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color }}>{value}</p>
        <Icon size={16} style={{ color, opacity: 0.6 }} />
      </div>
    </div>
  );
}

// ── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>{children}</p>;
}

// ── Table wrapper (horizontal scroll, themed) ─────────────────────────────────
function ThemedTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...surface, overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        {children}
      </table>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '11px 16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', ...style }}>
      {children}
    </td>
  );
}

// ── Profit & Loss and Cash Flow now live in the Finance module (Chart of
// Accounts → ledger-based statements, branch-aware, BS/AD date filtering,
// PDF export, and period locking) so this page doesn't keep a second,
// independently-calculated copy of the same two reports around. This banner
// replaces the old duplicate tabs and links straight there.
function FinanceStatementsBanner() {
  return (
    <div style={{ ...surface, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(2,124,198,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Landmark size={16} color="#027cc6" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Profit & Loss and Cash Flow moved to Finance</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ledger-based, branch-aware, and downloadable as PDF from Finance → Profit & Loss / Cash Flow.</p>
        </div>
      </div>
      <Link href="/dashboard/finance" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#027cc6', padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(2,124,198,0.25)', whiteSpace: 'nowrap' }}>
        Open Finance <ArrowUpRight size={13} />
      </Link>
    </div>
  );
}

// ── Tab 3: Doctor Performance ─────────────────────────────────────────────────
function DoctorPerformanceTab() {
  const calendarType = useCalendarType();
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo]     = useState(now.toISOString().split('T')[0]);
  const { data = [], isLoading } = useQuery({
    queryKey: ['rev-doctor', from, to, calendarType],
    queryFn:  () => reportsApi.getRevenueByDoctor({ dateFrom: from, dateTo: to, calendarType }).then(r => r.data),
    enabled: !!from && !!to,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <DateFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 10px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
          Calendar: <strong style={{ color: 'var(--text-secondary)' }}>{calendarType}</strong>
        </span>
      </div>
      {isLoading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p> : (
        <>
          <div style={{ ...surface, padding: 20 }}>
            <SectionTitle>Revenue vs Commission by Doctor</SectionTitle>
            {rows.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '32px 0' }}>No doctor commission data for this period. Ensure invoices with doctor assignments exist.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rows} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="doctorName" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={(v) => fmtNPR(v)} contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="revenue"    fill="#6366f1" radius={[4,4,0,0]} name="Revenue" />
                  <Bar dataKey="commission" fill="#f59e0b" radius={[4,4,0,0]} name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <ThemedTable>
            <thead>
              <tr>{['Doctor','Revenue','Commission','Net to Clinic','# Invoices'].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.doctorId}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Td style={{ fontWeight: 600 }}>Dr. {r.doctorName}</Td>
                  <Td style={{ color: '#10b981' }}>{fmtNPR(r.revenue)}</Td>
                  <Td style={{ color: '#f59e0b' }}>{fmtNPR(r.commission)}</Td>
                  <Td style={{ fontWeight: 600 }}>{fmtNPR(r.net)}</Td>
                  <Td style={{ color: 'var(--text-muted)' }}>{r.invoiceCount ?? '—'}</Td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 12 }}>No data for selected period</td></tr>}
            </tbody>
          </ThemedTable>
        </>
      )}
    </div>
  );
}

// ── Tab 4: Service Revenue ────────────────────────────────────────────────────
function ServiceRevenueTab() {
  const calendarType = useCalendarType();
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo]     = useState(now.toISOString().split('T')[0]);
  const { data = [], isLoading } = useQuery({
    queryKey: ['rev-service', from, to, calendarType],
    queryFn:  () => reportsApi.getRevenueByService({ dateFrom: from, dateTo: to, calendarType }).then(r => r.data),
    enabled: !!from && !!to,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <DateFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 10px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
          Calendar: <strong style={{ color: 'var(--text-secondary)' }}>{calendarType}</strong>
        </span>
      </div>
      {isLoading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p> : (
        <>
          {rows.length > 0 && (
            <div style={{ ...surface, padding: 20 }}>
              <SectionTitle>Revenue by Service</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rows.slice(0, 10)} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="serviceName" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={(v) => fmtNPR(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4,4,0,0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ThemedTable>
            <thead>
              <tr>{['Service','Revenue','# Sessions','Avg Ticket'].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.serviceId}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Td style={{ fontWeight: 600 }}>{r.serviceName ?? '—'}</Td>
                  <Td style={{ color: '#10b981' }}>{fmtNPR(r.revenue)}</Td>
                  <Td>{r.count}</Td>
                  <Td>{fmtNPR(r.avgTicket)}</Td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 12 }}>No service revenue data for this period</td></tr>}
            </tbody>
          </ThemedTable>
        </>
      )}
    </div>
  );
}

// ── Tab 5: Outstanding Receivables ────────────────────────────────────────────
function ReceivablesTab() {
  const calendarType = useCalendarType();
  const { data } = useQuery({
    queryKey: ['receivables'],
    queryFn: () => reportsApi.getOutstandingReceivables().then(r => r.data),
  });
  const d = data as any;
  const buckets = [
    { label: 'Current',     value: d?.current,    color: '#10b981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)' },
    { label: '1–30 Days',   value: d?.days30,     color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)' },
    { label: '31–60 Days',  value: d?.days60,     color: '#f97316', bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.25)' },
    { label: '60+ Days',    value: d?.days90plus, color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} className="lg:grid-cols-4">
        {buckets.map(b => (
          <div key={b.label} style={{ padding: 18, borderRadius: 12, background: b.bg, border: `1px solid ${b.border}` }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{b.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: b.color }}>{fmtNPR(b.value)}</p>
          </div>
        ))}
      </div>

      <div style={surface}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Top Overdue Invoices</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Invoice #','Patient','Amount','Due Date','Days Overdue','Action'].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {(d?.topOverdue ?? d?.items ?? []).slice(0, 10).map((r: any) => (
                <tr key={r.id}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.invoiceNumber}</span></Td>
                  <Td style={{ fontWeight: 600 }}>{r.patientName}</Td>
                  <Td style={{ color: '#ef4444' }}>{fmtNPR(r.amount)}</Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>
                    {r.dueDate ? formatDate(new Date(r.dueDate), calendarType) : '—'}
                  </Td>
                  <Td>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {r.daysOverdue}d
                    </span>
                  </Td>
                  <Td>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#027cc6', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Send size={13} /> Reminder
                    </button>
                  </Td>
                </tr>
              ))}
              {(!d?.topOverdue?.length && !d?.items?.length) && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 12 }}>No overdue invoices</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab 6: Branch Performance ─────────────────────────────────────────────────
function BranchPerformanceTab() {
  const calendarType = useCalendarType();
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo]     = useState(now.toISOString().split('T')[0]);
  const { data = [], isLoading } = useQuery({
    queryKey: ['branch-perf', from, to, calendarType],
    queryFn: () => reportsApi.getBranchPerformance({ dateFrom: from, dateTo: to, calendarType }).then(r => r.data),
    enabled: !!from && !!to,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <DateFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 10px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
          Calendar: <strong style={{ color: 'var(--text-secondary)' }}>{calendarType}</strong>
        </span>
      </div>
      {isLoading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p> : (
        <>
          <div style={{ ...surface, padding: 20 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rows} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="branchName" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip formatter={(v) => fmtNPR(v)} contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="revenue"  fill="#6366f1" radius={[4,4,0,0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4,4,0,0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ThemedTable>
            <thead>
              <tr>{['Branch','Revenue','Expenses','Net','Profit Margin'].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.branchId}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Td style={{ fontWeight: 600 }}>{r.branchName}</Td>
                  <Td style={{ color: '#10b981' }}>{fmtNPR(r.revenue)}</Td>
                  <Td style={{ color: '#ef4444' }}>{fmtNPR(r.expenses)}</Td>
                  <Td style={{ fontWeight: 700, color: r.net >= 0 ? '#10b981' : '#ef4444' }}>{fmtNPR(r.net)}</Td>
                  <Td>{pct(r.profitMargin)}</Td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 12 }}>No branch data found</td></tr>}
            </tbody>
          </ThemedTable>
        </>
      )}
    </div>
  );
}

// ── Main Reports Page ─────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(0);

  const TAB_COMPONENTS = [
    <DoctorPerformanceTab key="dp" />,
    <ServiceRevenueTab   key="sr" />,
    <ReceivablesTab      key="ar" />,
    <BranchPerformanceTab key="bp" />,
  ];

  return (
    <PermissionGate permission="reports.view">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header title="Financial Reports" subtitle="Financial Analytics" />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}
          className="sm:p-6">

          <FinanceStatementsBanner />
          {/* ── Tab Bar (horizontally scrollable on mobile) ── */}
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

          {/* ── Tab Content ── */}
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