'use client'

import { useState } from 'react'
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import type { LogEntry, LogLevel } from '@/lib/parking-sim'
import { cn } from '@/lib/utils'

const LEVEL_META: Record<LogLevel, { icon: typeof Info; label: string; className: string }> = {
  info: { icon: Info, label: '정보', className: 'text-primary' },
  warn: { icon: TriangleAlert, label: '경고', className: 'text-warning' },
  error: { icon: CircleAlert, label: '고장', className: 'text-destructive' },
}

type Filter = 'all' | LogLevel

export function EventLog({ logs, tall }: { logs: LogEntry[]; tall?: boolean }) {
  const [filter, setFilter] = useState<Filter>('all')
  const visible = filter === 'all' ? logs : logs.filter((l) => l.level === filter)

  return (
    <section aria-labelledby="event-log-title" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="event-log-title" className="text-sm font-semibold">
            알람 · 이벤트 로그
          </h2>
          <p className="text-xs text-muted-foreground">최근 {logs.length}건</p>
        </div>
        <div role="group" aria-label="로그 필터" className="flex rounded-md border border-border p-0.5">
          {(['all', 'info', 'warn', 'error'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                filter === f ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'all' ? '전체' : LEVEL_META[f].label}
            </button>
          ))}
        </div>
      </header>
      <ol className={cn('flex flex-col overflow-y-auto pr-1', tall ? 'max-h-[36rem]' : 'max-h-72')} aria-live="polite">
        {visible.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">표시할 이벤트가 없습니다</li>}
        {visible.map((log) => {
          const meta = LEVEL_META[log.level]
          const Icon = meta.icon
          return (
            <li
              key={log.id}
              className={cn(
                'grid grid-cols-[auto_auto_auto_1fr] items-center gap-3 border-b border-border/60 py-2 text-sm last:border-0',
                log.level === 'error' && 'bg-destructive/5',
              )}
            >
              <Icon className={cn('size-4', meta.className)} aria-label={meta.label} />
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{log.time}</span>
              <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{log.unit}</span>
              <span className="truncate text-pretty">{log.message}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
