import { Car } from 'lucide-react'
import type { ElevatorUnit } from '@/lib/parking-sim'
import { cn } from '@/lib/utils'

function Slot({ plate, target, side }: { plate: string | null; target: boolean; side: 'L' | 'R' }) {
  return (
    <div
      className={cn(
        'flex h-full items-center gap-1.5 rounded-sm border px-1.5 transition-colors',
        side === 'R' && 'flex-row-reverse',
        plate ? 'border-border bg-secondary' : 'border-dashed border-border/70',
        target && 'border-warning bg-warning/10',
      )}
    >
      {plate ? (
        <>
          <Car className={cn('size-3.5 shrink-0', target ? 'text-warning' : 'text-primary')} aria-hidden="true" />
          <span className="truncate font-mono text-[10px] text-muted-foreground">{plate}</span>
        </>
      ) : (
        <span className="font-mono text-[10px] text-muted-foreground/50">EMPTY</span>
      )}
    </div>
  )
}

export function ElevatorVisual({ unit }: { unit: ElevatorUnit }) {
  const rows = unit.floors + 1
  const floors = Array.from({ length: unit.floors }, (_, i) => unit.floors - i)
  const targetSlot = unit.current?.slot ?? -1
  const carried =
    unit.current &&
    ((unit.current.type === 'in' && unit.slots[unit.current.slot] === null && unit.current.stepIndex >= 2) ||
      (unit.current.type === 'out' && unit.slots[unit.current.slot] === null))

  return (
    <figure className="flex flex-col gap-2" aria-label="승강기형 주차기 단면도">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>단면도 · {unit.floors}층 × {unit.perFloor}열</span>
        <span className="font-mono">
          LIFT <span className="text-primary">{unit.liftPos.toFixed(2)}F</span>
        </span>
      </div>
      <div className="relative grid h-[26rem] grid-cols-[2rem_1fr_3.5rem_1fr] gap-x-1.5 rounded-md bg-background/60 p-2">
        <div className="col-start-1 row-start-1 grid gap-y-1 py-0.5" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
          {floors.map((f) => (
            <span key={f} className="flex items-center font-mono text-[10px] text-muted-foreground">
              {f}F
            </span>
          ))}
          <span className="flex items-center font-mono text-[10px] font-bold text-primary">G</span>
        </div>

        {[0, 1].map((side) => (
          <div
            key={side}
            className={cn('grid gap-y-1 py-0.5', side === 0 ? 'col-start-2' : 'col-start-4')}
            style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
          >
            {floors.map((f) => {
              const slot = (f - 1) * unit.perFloor + side
              return (
                <Slot key={f} plate={unit.slots[slot]} target={slot === targetSlot} side={side === 0 ? 'L' : 'R'} />
              )
            })}
            <div className="flex items-center justify-center rounded-sm bg-primary/10 font-mono text-[10px] font-semibold text-primary">
              {side === 0 ? '입고구' : '출고구'}
            </div>
          </div>
        ))}

        <div className="relative col-start-3 row-start-1 rounded-sm border-x border-border bg-secondary/30">
          <div
            className="absolute inset-x-0.5 flex items-center justify-center rounded-sm border border-primary bg-primary/20 transition-[bottom] duration-300 ease-linear"
            style={{ bottom: `${(unit.liftPos / rows) * 100}%`, height: `${100 / rows}%` }}
          >
            {carried ? (
              <Car className="size-4 text-warning" aria-hidden="true" />
            ) : (
              <span className="font-mono text-[9px] font-bold text-primary">LIFT</span>
            )}
          </div>
        </div>
      </div>
    </figure>
  )
}
