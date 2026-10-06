export type UnitStatus = 'running' | 'idle' | 'maintenance' | 'fault'
export type JobType = 'in' | 'out'
export type LogLevel = 'info' | 'warn' | 'error'
export type SensorState = 'ok' | 'warn' | 'error'
export type SensorKey = 'power' | 'door' | 'overload' | 'fire' | 'comm' | 'emergency'
export type UnitId = 'elevator' | 'circulation'

type Step =
  | { kind: 'move'; to: number }
  | { kind: 'hold'; ticks: number; label: string; effect?: 'store' | 'retrieve' }

export interface QueuedJob {
  id: number
  type: JobType
  plate: string
  slot: number
  createdTick: number
}

export interface ActiveJob extends QueuedJob {
  steps: Step[]
  stepIndex: number
}

export interface Telemetry {
  load: number
  temp: number
  power: number
}

interface UnitBase {
  id: UnitId
  name: string
  code: string
  status: UnitStatus
  slots: (string | null)[]
  queue: QueuedJob[]
  current: ActiveJob | null
  telemetry: Telemetry
  sensors: Record<SensorKey, SensorState>
  completedIn: number
  completedOut: number
  waitTicks: number[]
}

export interface ElevatorUnit extends UnitBase {
  kind: 'elevator'
  floors: number
  perFloor: number
  liftPos: number
}

export interface CirculationUnit extends UnitBase {
  kind: 'circulation'
  rotation: number
}

export type ParkingUnit = ElevatorUnit | CirculationUnit

export interface LogEntry {
  id: number
  time: string
  unit: string
  level: LogLevel
  message: string
}

export interface HistoryPoint {
  t: string
  elevatorLoad: number
  circulationLoad: number
  elevatorTemp: number
  circulationTemp: number
}

export interface HourlyPoint {
  hour: string
  elevatorIn: number
  elevatorOut: number
  circulationIn: number
  circulationOut: number
}

export interface SimState {
  ready: boolean
  tick: number
  nextId: number
  elevator: ElevatorUnit
  circulation: CirculationUnit
  logs: LogEntry[]
  history: HistoryPoint[]
  hourly: HourlyPoint[]
}

export type SimAction =
  | { type: 'init'; now: number }
  | { type: 'tick'; now: number; auto: boolean }
  | { type: 'request'; unit: UnitId; job: JobType; now: number }
  | { type: 'fault'; unit: UnitId; now: number }
  | { type: 'recover'; unit: UnitId; now: number }
  | { type: 'maintenance'; unit: UnitId; now: number }

export const TICK_SECONDS = 0.4
const ELEVATOR_SPEED = 0.25
const ROTATION_SPEED = 0.2
const HISTORY_LENGTH = 45
const LOG_LIMIT = 60

const HANGUL = ['가', '나', '다', '라', '마', '거', '너', '더', '러', '머', '버', '서', '어', '저', '고', '노', '도', '로', '모', '보', '소', '오', '조', '구', '누', '두', '루', '무', '부', '수', '우', '주', '하', '허', '호']

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function makePlate(rand: () => number) {
  const head = String(10 + Math.floor(rand() * 290)).padStart(2, '0')
  const mid = HANGUL[Math.floor(rand() * HANGUL.length)]
  const tail = String(Math.floor(rand() * 10000)).padStart(4, '0')
  return `${head}${mid} ${tail}`
}

const okSensors = (): Record<SensorKey, SensorState> => ({
  power: 'ok',
  door: 'ok',
  overload: 'ok',
  fire: 'ok',
  comm: 'ok',
  emergency: 'ok',
})

export function createInitialState(): SimState {
  const rand = seeded(20260610)
  const elevatorSlots = Array.from({ length: 20 }, () => (rand() < 0.6 ? makePlate(rand) : null))
  const circulationSlots = Array.from({ length: 16 }, () => (rand() < 0.55 ? makePlate(rand) : null))

  return {
    ready: false,
    tick: 0,
    nextId: 1,
    elevator: {
      id: 'elevator',
      kind: 'elevator',
      name: '승강기형 주차기',
      code: 'EL-01',
      status: 'idle',
      slots: elevatorSlots,
      queue: [],
      current: null,
      telemetry: { load: 6, temp: 31, power: 0.8 },
      sensors: okSensors(),
      completedIn: 0,
      completedOut: 0,
      waitTicks: [],
      floors: 10,
      perFloor: 2,
      liftPos: 0,
    },
    circulation: {
      id: 'circulation',
      kind: 'circulation',
      name: '다층순환형 주차기',
      code: 'CR-01',
      status: 'idle',
      slots: circulationSlots,
      queue: [],
      current: null,
      telemetry: { load: 5, temp: 30, power: 0.6 },
      sensors: okSensors(),
      completedIn: 0,
      completedOut: 0,
      waitTicks: [],
      rotation: 0,
    },
    logs: [],
    history: [],
    hourly: [],
  }
}

const formatTime = (now: number) =>
  new Date(now).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function slotLabel(unit: ParkingUnit, slot: number) {
  if (unit.kind === 'elevator') {
    const floor = Math.floor(slot / unit.perFloor) + 1
    const side = slot % unit.perFloor === 0 ? 'L' : 'R'
    return `${floor}F-${side}`
  }
  return `P${String(slot + 1).padStart(2, '0')}`
}

function reservedSlots(unit: ParkingUnit) {
  const set = new Set(unit.queue.map((j) => j.slot))
  if (unit.current) set.add(unit.current.slot)
  return set
}

function pickSlot(unit: ParkingUnit, job: JobType) {
  const reserved = reservedSlots(unit)
  const candidates = unit.slots
    .map((plate, index) => ({ plate, index }))
    .filter(({ plate, index }) => !reserved.has(index) && (job === 'in' ? plate === null : plate !== null))
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function buildSteps(unit: ParkingUnit, job: QueuedJob): Step[] {
  if (unit.kind === 'elevator') {
    const floor = Math.floor(job.slot / unit.perFloor) + 1
    return job.type === 'in'
      ? [
          { kind: 'move', to: 0 },
          { kind: 'hold', ticks: 4, label: '차량 진입 · 파렛트 로딩' },
          { kind: 'move', to: floor },
          { kind: 'hold', ticks: 3, label: '파렛트 격납', effect: 'store' },
          { kind: 'move', to: 0 },
        ]
      : [
          { kind: 'move', to: floor },
          { kind: 'hold', ticks: 3, label: '파렛트 인출', effect: 'retrieve' },
          { kind: 'move', to: 0 },
          { kind: 'hold', ticks: 4, label: '차량 출차' },
        ]
  }
  const n = unit.slots.length
  let delta = (((job.slot - unit.rotation) % n) + n) % n
  if (delta > n / 2) delta -= n
  const target = unit.rotation + delta
  return [
    { kind: 'move', to: target },
    {
      kind: 'hold',
      ticks: 4,
      label: job.type === 'in' ? '차량 진입 · 파렛트 적재' : '차량 출차',
      effect: job.type === 'in' ? 'store' : 'retrieve',
    },
  ]
}

export function currentStepLabel(unit: ParkingUnit) {
  const job = unit.current
  if (!job) return null
  const step = job.steps[job.stepIndex]
  if (!step) return null
  if (step.kind === 'hold') return step.label
  if (unit.kind === 'elevator') return step.to === 0 ? '입출고층으로 이동' : `${step.to}F로 승강 중`
  return `${slotLabel(unit, job.slot)} 파렛트 순환 이동`
}

interface Ctx {
  now: number
  tick: number
  logs: LogEntry[]
  nextId: number
  hourly: HourlyPoint[]
}

function pushLog(ctx: Ctx, unit: ParkingUnit, level: LogLevel, message: string) {
  ctx.logs = [{ id: ctx.nextId++, time: formatTime(ctx.now), unit: unit.code, level, message }, ...ctx.logs].slice(
    0,
    LOG_LIMIT,
  )
}

function recordHourly(ctx: Ctx, unit: ParkingUnit, job: JobType) {
  const hour = new Date(ctx.now).getHours()
  const key = `${unit.id}${job === 'in' ? 'In' : 'Out'}` as keyof Omit<HourlyPoint, 'hour'>
  ctx.hourly = ctx.hourly.map((h, i) => (i === hour ? { ...h, [key]: h[key] + 1 } : h))
}

function updateTelemetry<T extends ParkingUnit>(unit: T, ctx: Ctx): T {
  const step = unit.current?.steps[unit.current.stepIndex]
  const active = unit.status === 'running'
  const target = !active ? 4 : step?.kind === 'move' ? 62 + Math.random() * 28 : 30 + Math.random() * 10
  const load = Math.max(0, Math.min(100, unit.telemetry.load + (target - unit.telemetry.load) * 0.35 + (Math.random() - 0.5) * 4))
  const temp = unit.telemetry.temp + (30 + load * 0.42 - unit.telemetry.temp) * 0.05
  const power = 0.5 + load * 0.11

  const sensors = { ...unit.sensors }
  const overloadState: SensorState = load > 88 ? 'warn' : 'ok'
  const tempHigh = temp > 58
  if (unit.status !== 'fault') {
    if (overloadState !== sensors.overload) {
      if (overloadState === 'warn') pushLog(ctx, unit, 'warn', `모터 부하 ${load.toFixed(0)}% — 과부하 경고`)
      sensors.overload = overloadState
    }
    const powerState: SensorState = tempHigh ? 'warn' : 'ok'
    if (powerState !== sensors.power) {
      if (powerState === 'warn') pushLog(ctx, unit, 'warn', `모터 온도 ${temp.toFixed(1)}°C — 냉각 필요`)
      sensors.power = powerState
    }
  }
  return { ...unit, telemetry: { load, temp, power }, sensors }
}

function tickUnit<T extends ParkingUnit>(input: T, ctx: Ctx): T {
  let unit = { ...input }
  if (unit.status === 'fault' || unit.status === 'maintenance') {
    return updateTelemetry(unit, ctx)
  }

  if (!unit.current && unit.queue.length > 0) {
    const [next, ...rest] = unit.queue
    unit.current = { ...next, steps: buildSteps(unit, next), stepIndex: 0 }
    unit.queue = rest
    pushLog(ctx, unit, 'info', `${next.type === 'in' ? '입고' : '출고'} 작업 시작 · ${next.plate} → ${slotLabel(unit, next.slot)}`)
  }

  const job = unit.current
  if (job) {
    const step = job.steps[job.stepIndex]
    if (step.kind === 'move') {
      const speed = unit.kind === 'elevator' ? ELEVATOR_SPEED : ROTATION_SPEED
      const pos = unit.kind === 'elevator' ? unit.liftPos : unit.rotation
      const diff = step.to - pos
      const reached = Math.abs(diff) <= speed
      const nextPos = reached ? step.to : pos + Math.sign(diff) * speed
      unit = (unit.kind === 'elevator' ? { ...unit, liftPos: nextPos } : { ...unit, rotation: nextPos }) as T
      if (reached) unit.current = { ...job, stepIndex: job.stepIndex + 1 }
    } else {
      const remaining = step.ticks - 1
      if (remaining > 0) {
        const steps = [...job.steps]
        steps[job.stepIndex] = { ...step, ticks: remaining }
        unit.current = { ...job, steps }
      } else {
        if (step.effect) {
          const slots = [...unit.slots]
          slots[job.slot] = step.effect === 'store' ? job.plate : null
          unit.slots = slots
        }
        unit.current = { ...job, stepIndex: job.stepIndex + 1 }
      }
    }

    if (unit.current && unit.current.stepIndex >= unit.current.steps.length) {
      const done = unit.current
      if (done.type === 'in') unit.completedIn += 1
      else unit.completedOut += 1
      unit.waitTicks = [...unit.waitTicks, ctx.tick - done.createdTick].slice(-30)
      recordHourly(ctx, unit, done.type)
      pushLog(ctx, unit, 'info', `${done.type === 'in' ? '입고' : '출고'} 완료 · ${done.plate} (${slotLabel(unit, done.slot)})`)
      unit.current = null
    }
  }

  unit.status = unit.current || unit.queue.length > 0 ? 'running' : 'idle'
  return updateTelemetry(unit, ctx)
}

function enqueue<T extends ParkingUnit>(unit: T, job: JobType, ctx: Ctx, silent = false): T {
  const pick = pickSlot(unit, job)
  if (!pick) {
    if (!silent) pushLog(ctx, unit, 'warn', job === 'in' ? '가용 주차면 없음 — 입고 요청 거절' : '출고 가능한 차량 없음')
    return unit
  }
  const plate = job === 'in' ? makePlate(Math.random) : (pick.plate as string)
  const queued: QueuedJob = { id: ctx.nextId++, type: job, plate, slot: pick.index, createdTick: ctx.tick }
  pushLog(ctx, unit, 'info', `${job === 'in' ? '입고' : '출고'} 요청 접수 · ${plate}`)
  return { ...unit, queue: [...unit.queue, queued] }
}

function autoRequest<T extends ParkingUnit>(unit: T, ctx: Ctx): T {
  if (unit.status === 'fault' || unit.status === 'maintenance') return unit
  if (unit.queue.length >= 2 || Math.random() > 0.07) return unit
  const occupancy = unit.slots.filter(Boolean).length / unit.slots.length
  const job: JobType = occupancy < 0.35 ? 'in' : occupancy > 0.9 ? 'out' : Math.random() < 0.5 ? 'in' : 'out'
  return enqueue(unit, job, ctx, true)
}

function seedHourly(now: number): HourlyPoint[] {
  const rand = seeded(42)
  const currentHour = new Date(now).getHours()
  const profile = [1, 0, 0, 0, 0, 1, 2, 5, 9, 7, 5, 4, 6, 5, 4, 5, 6, 8, 10, 7, 5, 3, 2, 1]
  return profile.map((base, hour) => {
    const active = hour < currentHour
    const v = (scale: number) => (active ? Math.max(0, Math.round(base * scale + (rand() - 0.5) * 3)) : 0)
    return {
      hour: `${String(hour).padStart(2, '0')}시`,
      elevatorIn: v(1.1),
      elevatorOut: v(1),
      circulationIn: v(0.8),
      circulationOut: v(0.75),
    }
  })
}

export function simReducer(state: SimState, action: SimAction): SimState {
  const ctx: Ctx = { now: action.now, tick: state.tick, logs: state.logs, nextId: state.nextId, hourly: state.hourly }
  const finish = (partial: Partial<SimState>): SimState => ({
    ...state,
    ...partial,
    logs: ctx.logs,
    nextId: ctx.nextId,
    hourly: ctx.hourly,
  })
  const target = 'unit' in action ? state[action.unit] : null

  switch (action.type) {
    case 'init': {
      if (state.ready) return state
      ctx.hourly = seedHourly(action.now)
      pushLog(ctx, state.elevator, 'info', '관제 시스템 연결 · PLC 통신 정상')
      pushLog(ctx, state.circulation, 'info', '관제 시스템 연결 · PLC 통신 정상')
      return finish({ ready: true })
    }
    case 'tick': {
      ctx.tick = state.tick + 1
      let elevator = tickUnit(state.elevator, ctx)
      let circulation = tickUnit(state.circulation, ctx)
      if (action.auto) {
        elevator = autoRequest(elevator, ctx)
        circulation = autoRequest(circulation, ctx)
      }
      const point: HistoryPoint = {
        t: formatTime(action.now),
        elevatorLoad: Math.round(elevator.telemetry.load),
        circulationLoad: Math.round(circulation.telemetry.load),
        elevatorTemp: Number(elevator.telemetry.temp.toFixed(1)),
        circulationTemp: Number(circulation.telemetry.temp.toFixed(1)),
      }
      return finish({
        tick: ctx.tick,
        elevator,
        circulation,
        history: [...state.history, point].slice(-HISTORY_LENGTH),
      })
    }
    case 'request': {
      if (!target || target.status === 'fault' || target.status === 'maintenance') return state
      return finish({ [action.unit]: enqueue(target, action.job, ctx) })
    }
    case 'fault': {
      if (!target || target.status === 'fault') return state
      pushLog(ctx, target, 'error', '비상정지 발생 · 리프트 구동부 이상 감지')
      return finish({
        [action.unit]: { ...target, status: 'fault', sensors: { ...target.sensors, emergency: 'error', door: 'warn' } },
      })
    }
    case 'recover': {
      if (!target || (target.status !== 'fault' && target.status !== 'maintenance')) return state
      pushLog(ctx, target, 'info', target.status === 'fault' ? '고장 복구 완료 · 운전 재개' : '점검 완료 · 운전 재개')
      return finish({ [action.unit]: { ...target, status: 'idle', sensors: okSensors() } })
    }
    case 'maintenance': {
      if (!target || target.status === 'fault' || target.status === 'maintenance') return state
      pushLog(ctx, target, 'warn', '점검 모드 전환 · 신규 작업 보류')
      return finish({ [action.unit]: { ...target, status: 'maintenance', sensors: { ...target.sensors, door: 'warn' } } })
    }
  }
}
