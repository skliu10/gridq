'use client'
import { useState, useCallback } from 'react'
import { MapFilters, FuelType } from '@/types'
import { DEFAULT_FILTERS } from '@/lib/constants'

export function useMapFilters() {
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS)

  const setThreshold = useCallback((v: number) => {
    setFilters(f => ({ ...f, threshold: v }))
  }, [])

  const setMinMW = useCallback((v: number) => {
    setFilters(f => ({ ...f, minMW: v }))
  }, [])

  const toggleFuel = useCallback((fuel: FuelType) => {
    setFilters(f => ({
      ...f,
      fuels: f.fuels.includes(fuel)
        ? f.fuels.filter(x => x !== fuel)
        : [...f.fuels, fuel],
    }))
  }, [])

  const setShowActive = useCallback((v: boolean) => {
    setFilters(f => ({ ...f, showActive: v }))
  }, [])

  const setShowWithdrawn = useCallback((v: boolean) => {
    setFilters(f => ({ ...f, showWithdrawn: v }))
  }, [])

  const setShowQueueDots = useCallback((v: boolean) => {
    setFilters(f => ({ ...f, showQueueDots: v }))
  }, [])

  const setShowISOBorders = useCallback((v: boolean) => {
    setFilters(f => ({ ...f, showISOBorders: v }))
  }, [])

  const setCodFilter = useCallback((v: MapFilters['codFilter']) => {
    setFilters(f => ({ ...f, codFilter: v }))
  }, [])

  return {
    filters,
    setThreshold,
    setMinMW,
    toggleFuel,
    setShowActive,
    setShowWithdrawn,
    setShowQueueDots,
    setShowISOBorders,
    setCodFilter,
  }
}
