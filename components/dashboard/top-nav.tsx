'use client'

import { useEffect, useState } from 'react'
import { Bell, LayoutGrid, ArrowUpDown, RefreshCcw, ScrollText, SquareParking } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DashboardView = 'all' | 'elevator' | 'circulation' | 'logs'

const NAV_ITEMS: { id: DashboardView; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'all', label: '통합 현황', icon: LayoutGrid },
  { id: 'elevator', label: '승강기형', icon: ArrowUpDown },
  { id: 'circulation', label: '다층순환형', icon: RefreshCcw },
  { id: 'logs', label: '알람 · 이벤트', icon: ScrollText },
]

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <time className="font-mono text-sm tabular-nums text-foreground" suppressHydrationWarning>
      {now ? now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
    </time>
  )
}

interface TopNavProps {
  view: DashboardView
  onViewChange: (view: DashboardView) => void
  alarmCount: number
}

export function TopNav({ view, onViewChange, alarmCount }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-8 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <SquareParking className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">PARK·OPS</span>
              <span className="text-[11px] text-muted-foreground">기계식 주차설비 관제</span>
            </div>
          </div>
          <div className="flex items-center gap-3 md:hidden">
            <LiveClock />
          </div>
        </div>

        <nav aria-label="주요 메뉴" className="-mx-1 overflow-x-auto">
          <ul className="flex items-center gap-1 px-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = view === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onViewChange(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-secondary text-foreground ring-1 ring-inset ring-border'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('size-4', active && 'text-primary')} aria-hidden="true" />
                    {item.label}
                    {item.id === 'logs' && alarmCount > 0 && (
                      <span className="rounded bg-destructive px-1.5 font-mono text-[10px] font-bold text-foreground">
                        {alarmCount}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-4 md:flex">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            PLC 연결됨
          </div>
          <LiveClock />
          <button
            type="button"
            onClick={() => onViewChange('logs')}
            className="relative flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`활성 알람 ${alarmCount}건`}
          >
            <Bell className="size-4" aria-hidden="true" />
            {alarmCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive font-mono text-[10px] font-bold text-foreground">
                {alarmCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
