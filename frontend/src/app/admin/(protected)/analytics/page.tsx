'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getAnalytics } from '@/lib/admin-api';
import type {
  AnalyticsDashboard,
  AnalyticsPeriodCount,
} from '@/lib/admin-types';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';

// --- Small presentational helpers -------------------------------------------

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString();
}

function CellCount({
  count,
  suppressed,
}: {
  count: number | null;
  suppressed: boolean;
}) {
  if (suppressed) {
    return (
      <span className="text-xs italic text-slate-400">Suppressed {'(n < 5)'}</span>
    );
  }
  return <span className="font-medium text-slate-900">{formatNumber(count)}</span>;
}

function bucketLabel(bucket: string): string {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Dependency-free vertical bar chart for a time series. */
function TrendChart({ data }: { data: AnalyticsPeriodCount[] }) {
  const max = useMemo(
    () => Math.max(1, ...data.map((d) => d.count)),
    [data]
  );

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No data in the selected window.</p>;
  }

  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d) => (
        <div
          key={d.bucket}
          className="flex-1 flex flex-col items-center justify-end gap-1"
          title={`${bucketLabel(d.bucket)}: ${d.count}`}
        >
          <span className="text-[10px] text-slate-500">{d.count}</span>
          <div
            className="w-full bg-[#0F766E]/75 rounded-t"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}px` }}
          />
          <span className="w-full truncate text-center text-[10px] text-slate-400">
            {bucketLabel(d.bucket)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface BarItem {
  label: string;
  value: number | null;
  suppressed: boolean;
  sub?: string;
}

/** Dependency-free horizontal bar list for distributions. */
function BarList({ items }: { items: BarItem[] }) {
  const max = useMemo(
    () => Math.max(1, ...items.map((i) => i.value ?? 0)),
    [items]
  );

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const key = `${item.sub ?? ''}${item.label}`;
        return (
          <li key={key} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-sm text-slate-600">
              {item.label}
            </span>
            <div className="flex-1 h-6 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full bg-[#0F766E]/70"
                style={{
                  width:
                    item.suppressed || item.value === null
                      ? '0%'
                      : `${Math.max(2, (item.value / max) * 100)}%`,
                }}
              />
            </div>
            <span className="w-32 shrink-0 text-right text-sm">
              <CellCount count={item.value} suppressed={item.suppressed} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// --- Page -------------------------------------------------------------------

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAnalytics()
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load analytics.'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const severityItems: BarItem[] = useMemo(() => {
    const items: BarItem[] = [];
    for (const cell of data?.screenings.severity_distribution ?? []) {
      items.push({
        label: cell.severity,
        value: cell.count,
        suppressed: cell.suppressed,
        sub: `${cell.instrument}:`,
      });
    }
    return items;
  }, [data]);

  const riskCategoryItems: BarItem[] = useMemo(
    () =>
      (data?.safety.risk_category_distribution ?? []).map((cell) => ({
        label: cell.category,
        value: cell.count,
        suppressed: cell.suppressed,
      })),
    [data]
  );

  const languageItems: BarItem[] = useMemo(
    () =>
      (data?.sessions.language_distribution ?? []).map((cell) => ({
        label: cell.language,
        value: cell.count,
        suppressed: false,
      })),
    [data]
  );

  const statusItems: BarItem[] = useMemo(
    () =>
      (data?.bookings.by_status ?? []).map((cell) => ({
        label: statusLabel(cell.status),
        value: cell.count,
        suppressed: false,
      })),
    [data]
  );

  const counselors = data?.counselors ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-slate-600">
          Aggregate service usage. These are summary counts only — no individual
          student or booking data is shown.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {data === null && !error && (
        <p className="text-sm text-slate-500 py-6">Loading analytics…</p>
      )}

      {data !== null && (
        <div className="space-y-6">
          {/* Overview */}
          <section aria-label="Overview" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total sessions" value={formatNumber(data.overview.total_sessions)} />
            <StatCard label="Total screenings" value={formatNumber(data.overview.total_screenings)} />
            <StatCard label="Safety evaluations" value={formatNumber(data.overview.total_safety_evaluations)} />
            <StatCard label="Total bookings" value={formatNumber(data.overview.total_bookings)} />
            <StatCard label="Active counselors" value={formatNumber(data.overview.active_counselors)} />
            <StatCard label="Counselor slots" value={formatNumber(data.overview.total_counselor_slots)} />
            <StatCard
              label="Booking completion rate"
              value={formatPercent(data.overview.booking_completion_rate)}
            />
            <StatCard
              label="Booking cancellation rate"
              value={formatPercent(data.overview.booking_cancellation_rate)}
            />
          </section>

          {/* Sessions */}
          <Section
            title="Session trends"
            subtitle="New sessions over the last 30 days"
          >
            <TrendChart data={data.sessions.over_time} />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">By language</h3>
                <div className="mt-2">
                  <BarList items={languageItems} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Engagement</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Average messages per session:{' '}
                  <span className="font-medium text-slate-900">
                    {formatNumber(data.sessions.average_messages_per_session)}
                  </span>
                </p>
              </div>
            </div>
          </Section>

          {/* Screenings */}
          <Section
            title="Screening overview"
            subtitle="Summary scores only; individual answers are never stored or shown"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">By instrument</h3>
                <div className="mt-2">
                  <BarList
                    items={data.screenings.by_instrument.map((cell) => ({
                      label: cell.instrument,
                      value: cell.count,
                      suppressed: false,
                    }))}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">
                  Severity distribution
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Small cells are suppressed to protect student privacy.
                </p>
                <div className="mt-2">
                  <BarList items={severityItems} />
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Safety-flag rate:{' '}
              {data.screenings.safety_flag_rate.suppressed ? (
                <span className="italic text-slate-400">Suppressed {'(n < 5)'}</span>
              ) : (
                <span className="font-medium text-slate-900">
                  {formatPercent(data.screenings.safety_flag_rate.value)}
                </span>
              )}
            </p>
          </Section>

          {/* Safety / risk */}
          <Section
            title="Safety & risk overview"
            subtitle="Aggregate safety-evaluation metadata; small cells are suppressed"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">By risk level</h3>
                <div className="mt-2">
                  <BarList
                    items={data.safety.risk_level_distribution.map((cell) => ({
                      label: cell.risk_level,
                      value: cell.count,
                      suppressed: cell.suppressed,
                    }))}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">By category</h3>
                <div className="mt-2">
                  <BarList items={riskCategoryItems} />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Risk trend over the last 30 days
              </h3>
              <div className="mt-2">
                <RiskTrendTable cells={data.safety.risk_trends} />
              </div>
            </div>
          </Section>

          {/* Bookings */}
          <Section
            title="Booking overview"
            subtitle="Operational metrics only; bookings are never linked to wellbeing data"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">By status</h3>
                <div className="mt-2">
                  <BarList items={statusItems} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Funnel</h3>
                <div className="mt-2">
                  <BarList
                    items={data.bookings.funnel.map((stage) => ({
                      label: stage.stage,
                      value: stage.count,
                      suppressed: false,
                    }))}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Booking trend over the last 30 days
              </h3>
              <div className="mt-2">
                <TrendChart data={data.bookings.over_time} />
              </div>
            </div>
          </Section>

          {/* Counselor utilization */}
          <Section
            title="Counselor utilization"
            subtitle="Operational slot and booking metrics per counselor"
          >
            {counselors.length === 0 ? (
              <p className="text-sm text-slate-500">No counselors configured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">
                    Counselor operational metrics: slots, bookings, and utilization.
                  </caption>
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Counselor</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Slots</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Booked</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Utilization</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Completed</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Pending</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {counselors.map((c) => (
                      <tr key={c.counselor_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                        <td className="px-4 py-3">
                          {c.is_active ? (
                            <Badge variant="sage">Active</Badge>
                          ) : (
                            <Badge variant="neutral">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatNumber(c.total_slots)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatNumber(c.booked_slots)}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">
                          {formatPercent(c.utilization_rate)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatNumber(c.completed_bookings)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatNumber(c.pending_bookings)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatNumber(c.cancelled_bookings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Provider usage */}
          <Section
            title="Provider usage"
            subtitle="Not available in v1"
          >
            <p className="text-sm text-slate-600">
              The chat provider used for each response is not persisted in the
              application data, so provider/fallback usage cannot be reported
              reliably without modifying the AI pipeline. This metric is
              intentionally omitted.
            </p>
          </Section>
        </div>
      )}
    </div>
  );
}

/** Compact risk-trend table with suppressed-cell handling. */
function RiskTrendTable({
  cells,
}: {
  cells: {
    bucket: string;
    risk_level: string;
    count: number | null;
    suppressed: boolean;
  }[];
}) {
  if (cells.length === 0) {
    return <p className="text-sm text-slate-500">No risk data in the selected window.</p>;
  }

  const grouped = new Map<string, typeof cells>();
  for (const cell of cells) {
    const list = grouped.get(cell.bucket) ?? [];
    list.push(cell);
    grouped.set(cell.bucket, list);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">Day</th>
            <th scope="col" className="px-4 py-2 font-semibold">NORMAL</th>
            <th scope="col" className="px-4 py-2 font-semibold">MODERATE</th>
            <th scope="col" className="px-4 py-2 font-semibold">HIGH RISK</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from(grouped.entries()).map(([bucket, list]) => {
            const byLevel = new Map(list.map((c) => [c.risk_level, c]));
            return (
              <tr key={bucket} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-700">{bucketLabel(bucket)}</td>
                {(['NORMAL', 'MODERATE', 'HIGH_RISK'] as const).map((level) => {
                  const cell = byLevel.get(level);
                  if (!cell) return <td key={level} className="px-4 py-2 text-slate-400">—</td>;
                  return (
                    <td key={level} className="px-4 py-2">
                      <CellCount count={cell.count} suppressed={cell.suppressed} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Booking status display labels (mirrors admin-format helpers). */
function statusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'COMPLETED':
      return 'Completed';
    default:
      return status;
  }
}