'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Users, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { commissionsApi, usersApi } from '@/lib/api';
import { useCalendarType } from '@/hooks/useCalendarType';
import { useAuthStore } from '@/store/auth.store';
import NoBranchBanner from '@/components/layout/NoBranchBanner';
import { NoBranchesExistBanner } from '@/components/layout/NoBranchesExistBanner';
import {
  BS_MONTHS,
  adToBS,
  bsToAD,
  getDaysInBSMonth,
  formatMonthYear,
  currentMonthRange,
} from '@/lib/calendar';
import Header from '@/components/layout/Header';
import type { CommissionSummary, CommissionSummaryDoctor } from '@/types';
import { format } from 'date-fns';

function fmtNPR(v: any) {
  const n = Number(v);
  return isNaN(n) ? 'NPR 0' : `NPR ${n.toLocaleString()}`;
}

// ── BS Month/Year picker ──────────────────────────────────────────────────────

const CURRENT_BS_YEAR = adToBS(new Date()).year;
const BS_YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_BS_YEAR - i);

interface BSDateFilter {
  bsYear: number;
  bsMonth: number; // 0-based
  bsDay: number;
  isStart: boolean; // true = day 1, false = last day of month
}

/** Convert a BS year/month selection to an AD ISO date string for the API */
function bsFilterToAD(year: number, month: number, isStart: boolean): string {
  const day = isStart ? 1 : getDaysInBSMonth(year, month);
  return format(bsToAD(year, month, day), 'yyyy-MM-dd');
}

function BSMonthPicker({
  label,
  year,
  month,
  onChange,
}: {
  label: string;
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[var(--text-muted)] shrink-0">{label}</span>
      <select
        value={month}
        onChange={e => onChange(year, Number(e.target.value))}
        className="input text-sm py-1.5 px-2"
        style={{ minWidth: 110 }}
      >
        {BS_MONTHS.map((m, i) => (
          <option key={m} value={i}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={e => onChange(Number(e.target.value), month)}
        className="input text-sm py-1.5 px-2"
        style={{ minWidth: 72 }}
      >
        {BS_YEARS.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

// ── Doctor row ────────────────────────────────────────────────────────────────

function DoctorRow({ doc }: { doc: CommissionSummaryDoctor }) {
  const [expanded, setExpanded] = useState(false);
  const name = doc.doctor
    ? `${doc.doctor.firstName} ${doc.doctor.lastName}`
    : `Doctor ${doc.doctorId.slice(0, 8)}`;

  return (
    <>
      {/* Mobile card layout */}
      <div className="block sm:hidden rounded-xl mb-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <button
          className="w-full p-4 text-left"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-[var(--text-primary)] truncate">{name}</span>
            </div>
            {expanded
              ? <ChevronDown size={18} className="text-brand-400 shrink-0" />
              : <ChevronRight size={18} className="text-[var(--text-muted)] shrink-0" />
            }
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Service Revenue</p>
              <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{fmtNPR(doc.totalServiceRevenue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Commission</p>
              <p className="text-sm font-semibold text-emerald-400 mt-0.5">{fmtNPR(doc.totalCommission)}</p>
            </div>
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4">
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-3 py-2 text-[var(--text-muted)] uppercase tracking-wider">Service</th>
                    <th className="text-left px-3 py-2 text-[var(--text-muted)] uppercase tracking-wider">Revenue</th>
                    <th className="text-left px-3 py-2 text-[var(--text-muted)] uppercase tracking-wider">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.byService.map((s, i) => (
                    <tr key={s.serviceId || i} style={{ borderBottom: i < doc.byService.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{s.service?.name || s.serviceId}</td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{fmtNPR(s.revenue)}</td>
                      <td className="px-3 py-2 text-emerald-400 font-medium">{fmtNPR(s.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table rows */}
      <tr
        className="hidden sm:table-row cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
        style={{ borderBottom: '1px solid var(--border)' }}
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            {expanded
              ? <ChevronDown size={16} className="text-brand-400" />
              : <ChevronRight size={16} className="text-[var(--text-muted)]" />
            }
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-[var(--text-primary)]">{name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-[var(--text-primary)]">{fmtNPR(doc.totalServiceRevenue)}</td>
        <td className="px-4 py-3">
          <span className="text-emerald-400 font-semibold">{fmtNPR(doc.totalCommission)}</span>
        </td>
        <td className="px-4 py-3 text-[var(--text-muted)]">{doc.byService.length} service{doc.byService.length !== 1 ? 's' : ''}</td>
      </tr>
      {expanded && (
        <tr className="hidden sm:table-row" style={{ borderBottom: '1px solid var(--border)' }}>
          <td colSpan={4} className="px-4 pb-3 pt-1">
            <div className="ml-10 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-3 py-2 text-[var(--text-muted)] uppercase tracking-wider">Service</th>
                    <th className="text-left px-3 py-2 text-[var(--text-muted)] uppercase tracking-wider">Revenue</th>
                    <th className="text-left px-3 py-2 text-[var(--text-muted)] uppercase tracking-wider">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.byService.map((s, i) => (
                    <tr key={s.serviceId || i} style={{ borderBottom: i < doc.byService.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{s.service?.name || s.serviceId}</td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{fmtNPR(s.revenue)}</td>
                      <td className="px-3 py-2 text-emerald-400 font-medium">{fmtNPR(s.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const calendarType = useCalendarType();

  // AD date filter state (used when calendarType === 'AD')
  const [adStartDate, setAdStartDate] = useState('');
  const [adEndDate,   setAdEndDate]   = useState('');

  // BS month filter state (used when calendarType === 'BS')
  const todayBS = adToBS(new Date());
  const [bsStartYear,  setBsStartYear]  = useState(todayBS.year);
  const [bsStartMonth, setBsStartMonth] = useState(todayBS.month);
  const [bsEndYear,    setBsEndYear]    = useState(todayBS.year);
  const [bsEndMonth,   setBsEndMonth]   = useState(todayBS.month);
  const [bsFilterActive, setBsFilterActive] = useState(false);

  const [doctorId, setDoctorId] = useState('');

  // Derive the actual startDate/endDate strings sent to the API
  let startDate: string | undefined;
  let endDate:   string | undefined;

  if (calendarType === 'BS') {
    if (bsFilterActive) {
      startDate = bsFilterToAD(bsStartYear, bsStartMonth, true);
      endDate   = bsFilterToAD(bsEndYear,   bsEndMonth,   false);
    }
  } else {
    startDate = adStartDate || undefined;
    endDate   = adEndDate   || undefined;
  }

  const hasFilter = !!(startDate || endDate || doctorId);
  const { activeBranch, branches, isHydrated } = useAuthStore();
  const branchId = activeBranch?.id;
  const hasNoBranches = isHydrated && branches.length === 0;

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => usersApi.listStaff({ limit: 100 }).then(r => r.data?.data ?? r.data ?? []),
  });
  const doctors = (Array.isArray(staffData) ? staffData : (staffData as any)?.data ?? []).filter((u: any) => /doctor|dentist/i.test(u.role));

  const { data, isLoading } = useQuery({
    queryKey: ['commissions', startDate, endDate, doctorId, branchId],
    queryFn: () =>
      commissionsApi.getSummary({
        startDate,
        endDate,
        doctorId: doctorId || undefined,
        branchId,
      }).then(r => r.data),
  });

  const { data: chartData } = useQuery({
    queryKey: ['commissions-chart', doctorId, calendarType, branchId],
    queryFn: () =>
      commissionsApi.getMonthlyChart({
        doctorId: doctorId || undefined,
        calendarType,
        branchId,
      }).then(r => r.data),
  });

  const summary: CommissionSummary | undefined = data;

  function clearFilters() {
    setAdStartDate(''); setAdEndDate('');
    setBsStartYear(todayBS.year); setBsStartMonth(todayBS.month);
    setBsEndYear(todayBS.year);   setBsEndMonth(todayBS.month);
    setBsFilterActive(false);
    setDoctorId('');
  }

  // Human-readable filter description for the summary section
  const filterLabel = bsFilterActive && calendarType === 'BS'
    ? `${BS_MONTHS[bsStartMonth]} ${bsStartYear} – ${BS_MONTHS[bsEndMonth]} ${bsEndYear} BS`
    : startDate && endDate
      ? `${startDate} – ${endDate}`
      : formatMonthYear(new Date(), calendarType);

  return (
    <div className="flex flex-col h-screen">
      <Header title="Doctor Commissions" />

      {hasNoBranches ? (
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          <NoBranchesExistBanner feature="Commissions" />
        </div>
      ) : (
      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">

        {!activeBranch && branches.length > 1 && <NoBranchBanner action="view branch-specific commissions" />}

        {/* Calendar mode badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            calendarType === 'BS'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-brand-500/10 text-brand-400'
          }`}>
            {calendarType === 'BS' ? '🇳🇵 Nepali BS' : '🌐 English AD'}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          {/* Doctor selector — always visible */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={doctorId}
              onChange={e => setDoctorId(e.target.value)}
              className="input text-sm w-full sm:w-auto"
            >
              <option value="">All doctors</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
              ))}
            </select>

            {/* BS month pickers */}
            {calendarType === 'BS' && (
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <BSMonthPicker
                  label="From"
                  year={bsStartYear}
                  month={bsStartMonth}
                  onChange={(y, m) => { setBsStartYear(y); setBsStartMonth(m); setBsFilterActive(true); }}
                />
                <BSMonthPicker
                  label="To"
                  year={bsEndYear}
                  month={bsEndMonth}
                  onChange={(y, m) => { setBsEndYear(y); setBsEndMonth(m); setBsFilterActive(true); }}
                />
              </div>
            )}

            {/* AD date inputs */}
            {calendarType === 'AD' && (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                <input
                  type="date"
                  value={adStartDate}
                  onChange={e => setAdStartDate(e.target.value)}
                  className="input text-sm"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={adEndDate}
                  onChange={e => setAdEndDate(e.target.value)}
                  className="input text-sm"
                  placeholder="End date"
                />
              </div>
            )}

            {hasFilter && (
              <button onClick={clearFilters} className="btn-ghost text-sm">Clear</button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            {
              label: 'Service Revenue',
              value: fmtNPR(summary?.totals.totalServiceRevenue),
              icon: TrendingUp,
              color: 'text-brand-400 bg-brand-400/10',
            },
            {
              label: 'Total Commissions',
              value: fmtNPR(summary?.totals.totalCommission),
              icon: DollarSign,
              color: 'text-emerald-400 bg-emerald-400/10',
            },
            {
              label: 'Doctors',
              value: summary?.doctors.length ?? 0,
              icon: Users,
              color: 'text-amber-400 bg-amber-400/10',
            },
          ].map(card => (
            <div key={card.label} className="rounded-xl p-3 sm:p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center mb-2`}>
                <card.icon size={17} />
              </div>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-tight">{card.label}</p>
              <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] mt-0.5">
                {isLoading ? '…' : card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Monthly chart — 6 months in the correct calendar */}
        {chartData && chartData.length > 0 && (
          <div className="rounded-xl p-4 mb-4 sm:mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
              Monthly Commission — 6 months
            </p>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              {calendarType === 'BS' ? 'Nepali BS months' : 'Gregorian AD months'}
            </p>
            <div className="flex items-end gap-1.5 sm:gap-2 h-24">
              {chartData.map((row: any, i: number) => {
                const maxComm = Math.max(...chartData.map((r: any) => Number(r.commission)));
                const pct = maxComm > 0 ? (Number(row.commission) / maxComm) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-[9px] text-[var(--text-muted)] text-center hidden sm:block">
                      {fmtNPR(row.commission)}
                    </p>
                    <div className="w-full rounded-t-sm bg-brand-600" style={{ height: `${Math.max(pct, 4)}%` }} />
                    <p className="text-[9px] text-[var(--text-muted)] truncate w-full text-center">{row.month}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Commission note */}
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs mb-4"
          style={{ background: 'rgba(14,157,232,0.04)', border: '1px solid rgba(14,157,232,0.12)' }}>
          <DollarSign size={15} className="text-brand-400 shrink-0 mt-0.5" />
          <span className="text-[var(--text-muted)]">
            Commissions are calculated <strong className="text-[var(--text-primary)]">only from service revenue</strong>.
            Product sales are excluded.
            {hasFilter && (
              <> Showing: <strong className="text-[var(--text-primary)]">{filterLabel}</strong></>
            )}
          </span>
        </div>

        {/* Mobile doctor cards */}
        <div className="block sm:hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" />
            </div>
          ) : !summary?.doctors.length ? (
            <div className="text-center py-12">
              <DollarSign size={36} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
              <p className="text-sm text-[var(--text-muted)]">No commission data for the selected period.</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Commissions are generated when invoices are paid.</p>
            </div>
          ) : (
            summary.doctors.map(doc => <DoctorRow key={doc.doctorId} doc={doc} />)
          )}
        </div>

        {/* Desktop doctor table */}
        <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                {['Doctor', 'Service Revenue', 'Commission Earned', 'Services'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-12">
                  <Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" />
                </td></tr>
              ) : !summary?.doctors.length ? (
                <tr><td colSpan={4} className="text-center py-12">
                  <DollarSign size={36} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">No commission data for the selected period.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Commissions are generated when invoices are paid.</p>
                </td></tr>
              ) : (
                summary.doctors.map(doc => <DoctorRow key={doc.doctorId} doc={doc} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}