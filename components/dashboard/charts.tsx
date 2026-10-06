'use client'

import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HistoryPoint, HourlyPoint, UnitId } from '@/lib/parking-sim'
import { cn } from '@/lib/utils'

const axisProps = {
  stroke: 'var(--muted-foreground)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

const tooltipProps = {
  contentStyle: {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--foreground)',
  },
  labelStyle: { color: 'var(--muted-foreground)' },
  cursor: { fill: 'var(--secondary)', opacity: 0.5 },
}

function ChartCard({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {action}
      </header>
      <div className="h-64">{children}</div>
    </section>
  )
}

export function ThroughputChart({ data, filter }: { data: HourlyPoint[]; filter: UnitId | 'all' }) {
  const rows = data.map((h) => ({
    hour: h.hour,
    입고: (filter !== 'circulation' ? h.elevatorIn : 0) + (filter !== 'elevator' ? h.circulationIn : 0),
    출고: (filter !== 'circulation' ? h.elevatorOut : 0) + (filter !== 'elevator' ? h.circulationOut : 0),
  }))
  return (
    <ChartCard title="시간대별 입출고 현황" subtitle="금일 00시 ~ 23시 · 실시간 누적">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" {...axisProps} interval={2} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip {...tooltipProps} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" iconSize={8} />
          <Bar dataKey="입고" fill="var(--chart-1)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="출고" fill="var(--chart-2)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

type Metric = 'load' | 'temp'

export function TelemetryChart({ data, filter }: { data: HistoryPoint[]; filter: UnitId | 'all' }) {
  const [metric, setMetric] = useState<Metric>('load')
  const showElevator = filter !== 'circulation'
  const showCirculation = filter !== 'elevator'

  return (
    <ChartCard
      title={metric === 'load' ? '실시간 모터 부하율' : '실시간 모터 온도'}
      subtitle={`최근 ${data.length}개 샘플 · 0.4초 주기`}
      action={
        <div role="group" aria-label="측정 항목" className="flex rounded-md border border-border p-0.5">
          {(['load', 'temp'] as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={metric === m}
              onClick={() => setMetric(m)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                metric === m ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'load' ? '부하 %' : '온도 °C'}
            </button>
          ))}
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" {...axisProps} minTickGap={40} />
          <YAxis {...axisProps} domain={metric === 'load' ? [0, 100] : [25, 70]} />
          <Tooltip {...tooltipProps} cursor={{ stroke: 'var(--border)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
          {showElevator && (
            <Line
              type="monotone"
              dataKey={metric === 'load' ? 'elevatorLoad' : 'elevatorTemp'}
              name="승강기형 EL-01"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
          {showCirculation && (
            <Line
              type="monotone"
              dataKey={metric === 'load' ? 'circulationLoad' : 'circulationTemp'}
              name="다층순환형 CR-01"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
