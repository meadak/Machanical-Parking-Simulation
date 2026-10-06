'use client'

import { useState } from 'react'
import { useParkingSim } from '@/hooks/use-parking-sim'
import type { ParkingUnit } from '@/lib/parking-sim'
import { TopNav, type DashboardView } from './top-nav'
import { SimControls } from './sim-controls'
import { KpiStrip } from './kpi-strip'
import { UnitPanel } from './unit-panel'
import { ElevatorVisual } from './elevator-visual'
import { CirculationVisual } from './circulation-visual'
import { ThroughputChart, TelemetryChart } from './charts'
import { EventLog } from './event-log'

const VIEW_TITLES: Record<DashboardView, { title: string; desc: string }> = {
  all: { title: '통합 운영 현황', desc: '승강기형 · 다층순환형 주차기 실시간 모니터링 및 운전 시뮬레이션' },
  elevator: { title: '승강기형 주차기', desc: '리프트 위치, 층별 격납 현황, 구동부 상태' },
  circulation: { title: '다층순환형 주차기', desc: '파렛트 순환 위치, 입출고구 정렬, 구동부 상태' },
  logs: { title: '알람 · 이벤트', desc: '설비별 운전 이력 및 경고 · 고장 알람' },
}

function countAlarms(unit: ParkingUnit) {
  const sensorAlarms = Object.values(unit.sensors).filter((s) => s !== 'ok').length
  return sensorAlarms + (unit.status === 'fault' ? 1 : 0)
}

export function Dashboard() {
  const [view, setView] = useState<DashboardView>('all')
  const { state, running, setRunning, speed, setSpeed, auto, setAuto, actions } = useParkingSim()
  const { elevator, circulation } = state

  const filter = view === 'elevator' || view === 'circulation' ? view : 'all'
  const units = filter === 'all' ? [elevator, circulation] : [state[filter]]
  const alarmCount = countAlarms(elevator) + countAlarms(circulation)
  const todayIn = state.hourly.reduce(
    (s, h) => s + (filter !== 'circulation' ? h.elevatorIn : 0) + (filter !== 'elevator' ? h.circulationIn : 0),
    0,
  )
  const todayOut = state.hourly.reduce(
    (s, h) => s + (filter !== 'circulation' ? h.elevatorOut : 0) + (filter !== 'elevator' ? h.circulationOut : 0),
    0,
  )

  const panelHandlers = {
    onRequest: actions.request,
    onFault: actions.fault,
    onRecover: actions.recover,
    onMaintenance: actions.maintenance,
  }

  const elevatorPanel = (
    <UnitPanel unit={elevator} typeLabel="수직 승강식" {...panelHandlers}>
      <ElevatorVisual unit={elevator} />
    </UnitPanel>
  )
  const circulationPanel = (
    <UnitPanel unit={circulation} typeLabel="다층 순환식" {...panelHandlers}>
      <CirculationVisual unit={circulation} />
    </UnitPanel>
  )

  return (
    <div className="min-h-dvh">
      <TopNav view={view} onViewChange={setView} alarmCount={alarmCount} />

      <main className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-5 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className={running ? 'text-primary' : 'text-warning'}>{running ? '● LIVE' : '❚❚ PAUSED'}</span>
              <span>{`TICK ${state.tick.toLocaleString()}`}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-balance">{VIEW_TITLES[view].title}</h1>
            <p className="text-sm text-muted-foreground text-pretty">{VIEW_TITLES[view].desc}</p>
          </div>
          <SimControls
            running={running}
            onToggleRunning={() => setRunning((r) => !r)}
            speed={speed}
            onSpeedChange={setSpeed}
            auto={auto}
            onToggleAuto={() => setAuto((a) => !a)}
          />
        </div>

        <KpiStrip units={units} todayIn={todayIn} todayOut={todayOut} alarmCount={alarmCount} />

        {view === 'logs' ? (
          <EventLog logs={state.logs} tall />
        ) : (
          <>
            <div className={filter === 'all' ? 'grid gap-5 2xl:grid-cols-2' : 'grid gap-5'}>
              {filter !== 'circulation' && elevatorPanel}
              {filter !== 'elevator' && circulationPanel}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <ThroughputChart data={state.hourly} filter={filter} />
              <TelemetryChart data={state.history} filter={filter} />
            </div>

            <EventLog logs={state.logs} />
          </>
        )}
      </main>
    </div>
  )
}
