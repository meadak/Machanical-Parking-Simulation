import { TICK_SECONDS, type ParkingUnit } from '@/lib/parking-sim'
import { cn } from '@/lib/utils'

interface KpiStripProps {
  units: ParkingUnit[]
  todayIn: number
  todayOut: number
  alarmCount: number
}

export function KpiStrip({ units, todayIn, todayOut, alarmCount }: KpiStripProps) {
  const total = units.reduce((s, u) => s + u.slots.length, 0)
  const occupied = units.reduce((s, u) => s + u.slots.filter(Boolean).length, 0)
  const waits = units.flatMap((u) => u.waitTicks)
  const avgWait = waits.length ? (waits.reduce((a, b) => a + b, 0) / waits.length) * TICK_SECONDS : 0
  const occupancy = total ? Math.round((occupied / total) * 100) : 0

  const items = [
    { label: '총 주차면', value: String(total), unit: '면' },
    { label: '주차 차량', value: String(occupied), unit: '대' },
    { label: '가용 주차면', value: String(total - occupied), unit: '면' },
    { label: '점유율', value: String(occupancy), unit: '%', bar: occupancy },
    { label: '금일 입고 / 출고', value: `${todayIn} / ${todayOut}`, unit: '건' },
    { label: '평균 처리시간', value: avgWait.toFixed(1), unit: '초' },
    { label: '활성 알람', value: String(alarmCount), unit: '건', alert: alarmCount > 0 },
  ]

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4 xl:grid-cols-7">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              'font-mono text-2xl font-semibold tabular-nums',
              item.alert ? 'text-destructive' : 'text-foreground',
            )}
          >
            {item.value}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{item.unit}</span>
          </dd>
          {item.bar !== undefined && (
            <div className="h-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
              <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${item.bar}%` }} />
            </div>
          )}
        </div>
      ))}
    </dl>
  )
}
