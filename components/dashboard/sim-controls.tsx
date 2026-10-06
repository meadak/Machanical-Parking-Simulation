'use client'

import { Pause, Play, Shuffle } from 'lucide-react'
import type { SimSpeed } from '@/hooks/use-parking-sim'
import { cn } from '@/lib/utils'

interface SimControlsProps {
  running: boolean
  onToggleRunning: () => void
  speed: SimSpeed
  onSpeedChange: (speed: SimSpeed) => void
  auto: boolean
  onToggleAuto: () => void
}

const SPEEDS: SimSpeed[] = [1, 2, 4]

export function SimControls({ running, onToggleRunning, speed, onSpeedChange, auto, onToggleAuto }: SimControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggleRunning}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
          running ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-warning text-warning-foreground hover:bg-warning/90',
        )}
      >
        {running ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
        {running ? '시뮬레이션 일시정지' : '시뮬레이션 재개'}
      </button>

      <div role="group" aria-label="시뮬레이션 속도" className="flex items-center rounded-md border border-border p-0.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeedChange(s)}
            aria-pressed={speed === s}
            className={cn(
              'rounded px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors',
              speed === s ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {`x${s}`}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onToggleAuto}
        aria-pressed={auto}
        className={cn(
          'flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
          auto ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
        )}
      >
        <Shuffle className="size-4" aria-hidden="true" />
        {auto ? '자동 입출고 ON' : '자동 입출고 OFF'}
      </button>
    </div>
  )
}
