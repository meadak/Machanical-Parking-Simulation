'use client'

import { useCallback, useEffect, useReducer, useState } from 'react'
import { createInitialState, simReducer, TICK_SECONDS, type JobType, type UnitId } from '@/lib/parking-sim'

export type SimSpeed = 1 | 2 | 4

export function useParkingSim() {
  const [state, dispatch] = useReducer(simReducer, undefined, createInitialState)
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState<SimSpeed>(1)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    dispatch({ type: 'init', now: Date.now() })
  }, [])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      dispatch({ type: 'tick', now: Date.now(), auto })
    }, (TICK_SECONDS * 1000) / speed)
    return () => window.clearInterval(id)
  }, [running, speed, auto])

  const request = useCallback((unit: UnitId, job: JobType) => dispatch({ type: 'request', unit, job, now: Date.now() }), [])
  const fault = useCallback((unit: UnitId) => dispatch({ type: 'fault', unit, now: Date.now() }), [])
  const recover = useCallback((unit: UnitId) => dispatch({ type: 'recover', unit, now: Date.now() }), [])
  const maintenance = useCallback((unit: UnitId) => dispatch({ type: 'maintenance', unit, now: Date.now() }), [])

  return {
    state,
    running,
    setRunning,
    speed,
    setSpeed,
    auto,
    setAuto,
    actions: { request, fault, recover, maintenance },
  }
}
