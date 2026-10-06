import { CirclePause, DoorClosed, Flame, OctagonX, Play, TriangleAlert, Weight, Wifi, Wrench, Zap } from 'lucide-react'
import type { SensorKey, SensorState, UnitStatus } from '@/lib/parking-sim'
import { cn } from '@/lib/utils'

const STATUS_META: Record<UnitStatus, { label: string; icon: typeof Play; className: string }> = {
  running: { label: '운전중', icon: Play, className: 'bg-primary/15 text-primary ring-primary/40' },
  idle: { label: '대기', icon: CirclePause, className: 'bg-muted text-muted-foreground ring-border' },
  maintenance: { label: '점검중', icon: Wrench, className: 'bg-warning/15 text-warning ring-warning/40' },
  fault: { label: '고장', icon: TriangleAlert, className: 'bg-destructive/15 text-destructive ring-destructive/50' },
}

export function StatusBadge({ status }: { status: UnitStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        meta.className,
      )}
    >
      <span className="relative flex size-2">
        {(status === 'running' || status === 'fault') && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
        )}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

const SENSOR_META: Record<SensorKey, { label: string; icon: typeof Zap }> = {
  power: { label: '모터/전원', icon: Zap },
  door: { label: '안전문', icon: DoorClosed },
  overload: { label: '과부하', icon: Weight },
  fire: { label: '화재감지', icon: Flame },
  comm: { label: 'PLC 통신', icon: Wifi },
  emergency: { label: '비상정지', icon: OctagonX },
}

const SENSOR_STATE: Record<SensorState, { text: string; className: string }> = {
  ok: { text: '정상', className: 'text-primary border-border bg-secondary/60' },
  warn: { text: '주의', className: 'text-warning border-warning/40 bg-warning/10' },
  error: { text: '이상', className: 'text-destructive border-destructive/50 bg-destructive/10' },
}

export function SensorGrid({ sensors }: { sensors: Record<SensorKey, SensorState> }) {
  return (
    <ul className="grid grid-cols-3 gap-2" aria-label="센서 상태">
      {(Object.keys(SENSOR_META) as SensorKey[]).map((key) => {
        const meta = SENSOR_META[key]
        const state = SENSOR_STATE[sensors[key]]
        const Icon = meta.icon
        return (
          <li
            key={key}
            className={cn('flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors', state.className)}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[11px] text-muted-foreground">{meta.label}</span>
              <span className="text-xs font-semibold">{state.text}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
