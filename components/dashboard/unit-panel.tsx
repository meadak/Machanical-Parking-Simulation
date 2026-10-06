'use client'

import type { ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, OctagonX, RotateCcw, Wrench } from 'lucide-react'
import { currentStepLabel, slotLabel, type JobType, type ParkingUnit, type UnitId } from '@/lib/parking-sim'
import { SensorGrid, StatusBadge } from './status-indicators'
import { cn } from '@/lib/utils'

interface UnitPanelProps {
  unit: ParkingUnit
  typeLabel: string
  children: ReactNode
  onRequest: (unit: UnitId, job: JobType) => void
  onFault: (unit: UnitId) => void
  onRecover: (unit: UnitId) => void
  onMaintenance: (unit: UnitId) => void
}

function Readout({ label, value, unit, warn }: { label: string; value: string; unit: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-secondary/60 px-3 py-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-lg font-semibold tabular-nums', warn ? 'text-warning' : 'text-foreground')}>
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </span>
    </div>
  )
}

export function UnitPanel({ unit, typeLabel, children, onRequest, onFault, onRecover, onMaintenance }: UnitPanelProps) {
  const occupied = unit.slots.filter(Boolean).length
  const halted = unit.status === 'fault' || unit.status === 'maintenance'
  const step = currentStepLabel(unit)

  return (
    <section
      aria-labelledby={`${unit.id}-title`}
      className={cn(
        'flex flex-col gap-4 rounded-lg border bg-card p-4 transition-colors lg:p-5',
        unit.status === 'fault' ? 'border-destructive/60' : 'border-border',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-muted-foreground">
            {unit.code} · {typeLabel}
          </span>
          <h2 id={`${unit.id}-title`} className="text-lg font-semibold text-balance">
            {unit.name}
          </h2>
        </div>
        <StatusBadge status={unit.status} />
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">{children}</div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Readout label="점유" value={`${occupied}/${unit.slots.length}`} unit="면" />
            <Readout
              label="모터 부하"
              value={unit.telemetry.load.toFixed(0)}
              unit="%"
              warn={unit.sensors.overload !== 'ok'}
            />
            <Readout label="온도" value={unit.telemetry.temp.toFixed(1)} unit="°C" warn={unit.sensors.power !== 'ok'} />
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">현재 작업</span>
              <span className="font-mono text-xs text-muted-foreground">대기열 {unit.queue.length}건</span>
            </div>
            {unit.current ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[11px] font-bold',
                      unit.current.type === 'in' ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning',
                    )}
                  >
                    {unit.current.type === 'in' ? '입고' : '출고'}
                  </span>
                  <span className="font-mono text-sm font-semibold">{unit.current.plate}</span>
                  <span className="font-mono text-xs text-muted-foreground">{slotLabel(unit, unit.current.slot)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {halted ? '작업 일시중단 — 설비 정지 상태' : step}
                </p>
                <div className="flex gap-1" aria-hidden="true">
                  {unit.current.steps.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full',
                        i < unit.current!.stepIndex ? 'bg-primary' : i === unit.current!.stepIndex ? 'bg-primary/50' : 'bg-secondary',
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{halted ? '설비 정지 상태' : '대기 중 — 요청 없음'}</p>
            )}
            {unit.queue.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 border-t border-border pt-2">
                {unit.queue.map((job) => (
                  <li key={job.id} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {job.type === 'in' ? '입' : '출'} {job.plate}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <SensorGrid sensors={unit.sensors} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          disabled={halted}
          onClick={() => onRequest(unit.id, 'in')}
          className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowDownToLine className="size-4 text-primary" aria-hidden="true" />
          입고 요청
        </button>
        <button
          type="button"
          disabled={halted}
          onClick={() => onRequest(unit.id, 'out')}
          className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUpFromLine className="size-4 text-warning" aria-hidden="true" />
          출고 요청
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          {halted ? (
            <button
              type="button"
              onClick={() => onRecover(unit.id)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {unit.status === 'fault' ? '고장 복구' : '점검 완료'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onMaintenance(unit.id)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Wrench className="size-4" aria-hidden="true" />
                점검 모드
              </button>
              <button
                type="button"
                onClick={() => onFault(unit.id)}
                className="flex items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <OctagonX className="size-4" aria-hidden="true" />
                고장 발생
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
