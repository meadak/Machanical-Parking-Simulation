import type { CirculationUnit } from '@/lib/parking-sim'

const W = 360
const H = 400
const CX = W / 2
const RADIUS = 70
const STRAIGHT = 220
const TOP = (H - STRAIGHT) / 2
const PERIMETER = 2 * STRAIGHT + 2 * Math.PI * RADIUS

/**
 * Vertical stadium loop: left column = 하층 진행, right column = 상층 진행.
 * Distance 0 is the bottom-center entrance; pallets travel counter-clockwise.
 */
function pointAt(distance: number) {
  let d = ((distance % PERIMETER) + PERIMETER) % PERIMETER
  const arc = Math.PI * RADIUS
  const halfArc = arc / 2
  const bottomY = TOP + STRAIGHT
  if (d < halfArc) {
    const a = Math.PI / 2 - d / RADIUS
    return { x: CX + RADIUS * Math.cos(a), y: bottomY + RADIUS * Math.sin(a) }
  }
  d -= halfArc
  if (d < STRAIGHT) return { x: CX + RADIUS, y: bottomY - d }
  d -= STRAIGHT
  if (d < arc) {
    const a = -d / RADIUS
    return { x: CX + RADIUS * Math.cos(a), y: TOP + RADIUS * Math.sin(a) }
  }
  d -= arc
  if (d < STRAIGHT) return { x: CX - RADIUS, y: TOP + d }
  d -= STRAIGHT
  const a = Math.PI - d / RADIUS
  return { x: CX + RADIUS * Math.cos(a), y: bottomY + RADIUS * Math.sin(a) }
}

const trackPath = [
  `M ${CX + RADIUS} ${TOP}`,
  `L ${CX + RADIUS} ${TOP + STRAIGHT}`,
  `A ${RADIUS} ${RADIUS} 0 0 1 ${CX - RADIUS} ${TOP + STRAIGHT}`,
  `L ${CX - RADIUS} ${TOP}`,
  `A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${TOP}`,
].join(' ')

export function CirculationVisual({ unit }: { unit: CirculationUnit }) {
  const n = unit.slots.length
  const targetSlot = unit.current?.slot ?? -1
  const entranceIndex = ((Math.round(unit.rotation) % n) + n) % n
  const rotating = unit.current?.steps[unit.current.stepIndex]?.kind === 'move'

  return (
    <figure className="flex flex-col gap-2" aria-label="다층순환형 주차기 순환 경로도">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>순환 경로도 · 파렛트 {n}기</span>
        <span className="font-mono">
          입구 <span className="text-primary">P{String(entranceIndex + 1).padStart(2, '0')}</span>
          {rotating && <span className="ml-2 text-warning">순환중</span>}
        </span>
      </div>
      <div className="flex h-[26rem] items-center justify-center rounded-md bg-background/60 p-2">
        <svg viewBox={`0 0 ${W} ${H + 30}`} className="h-full w-full" role="img" aria-label="파렛트 위치">
          <path d={trackPath} fill="none" stroke="var(--border)" strokeWidth={34} strokeLinejoin="round" />
          <path
            d={trackPath}
            fill="none"
            stroke="var(--primary)"
            strokeOpacity={rotating ? 0.6 : 0.2}
            strokeWidth={1.5}
            strokeDasharray="6 8"
          >
            {rotating && <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="0.6s" repeatCount="indefinite" />}
          </path>

          <text x={CX - RADIUS - 28} y={TOP + STRAIGHT / 2} fill="var(--muted-foreground)" fontSize={11} textAnchor="middle" transform={`rotate(-90 ${CX - RADIUS - 28} ${TOP + STRAIGHT / 2})`}>
            {'좌측 승강 라인'}
          </text>
          <text x={CX + RADIUS + 28} y={TOP + STRAIGHT / 2} fill="var(--muted-foreground)" fontSize={11} textAnchor="middle" transform={`rotate(90 ${CX + RADIUS + 28} ${TOP + STRAIGHT / 2})`}>
            {'우측 승강 라인'}
          </text>
          <text x={CX} y={TOP + STRAIGHT / 2 - 6} fill="var(--muted-foreground)" fontSize={11} textAnchor="middle">
            {'구동 모터'}
          </text>
          <text x={CX} y={TOP + STRAIGHT / 2 + 12} fill="var(--primary)" fontSize={12} fontFamily="var(--font-mono)" textAnchor="middle">
            {`${unit.telemetry.load.toFixed(0)}%`}
          </text>

          {unit.slots.map((plate, i) => {
            const frac = (((i - unit.rotation) % n) + n) % n / n
            const p = pointAt(frac * PERIMETER)
            const isTarget = i === targetSlot
            const atEntrance = i === entranceIndex
            return (
              <g key={i} transform={`translate(${p.x} ${p.y})`}>
                <rect
                  x={-22}
                  y={-11}
                  width={44}
                  height={22}
                  rx={3}
                  fill={plate ? 'var(--secondary)' : 'var(--background)'}
                  stroke={isTarget ? 'var(--warning)' : atEntrance ? 'var(--primary)' : 'var(--muted-foreground)'}
                  strokeOpacity={isTarget || atEntrance ? 1 : 0.35}
                  strokeWidth={isTarget ? 2 : 1}
                  strokeDasharray={plate ? undefined : '3 2'}
                />
                {plate && <rect x={-14} y={-6} width={28} height={12} rx={4} fill={isTarget ? 'var(--warning)' : 'var(--primary)'} fillOpacity={0.85} />}
                <text
                  y={plate ? 3.5 : 3.5}
                  fill={plate ? 'var(--primary-foreground)' : 'var(--muted-foreground)'}
                  fontSize={9}
                  fontWeight={700}
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {`P${String(i + 1).padStart(2, '0')}`}
                </text>
              </g>
            )
          })}

          <g transform={`translate(${CX} ${TOP + STRAIGHT + RADIUS + 22})`}>
            <rect x={-38} y={-9} width={76} height={18} rx={3} fill="var(--primary)" fillOpacity={0.15} />
            <text y={4} fill="var(--primary)" fontSize={10} fontWeight={700} textAnchor="middle">
              {'▲ 입출고구'}
            </text>
          </g>
        </svg>
      </div>
    </figure>
  )
}
