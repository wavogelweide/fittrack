import { describe, expect, it } from 'vitest'
import type { WorkoutLog } from '../db/types'
import {
  basisTempoKmh,
  empfohlenesIntervallTempo,
  formatiereTempoBereich,
  intervallTempo,
} from './tempo'

const LOGS: WorkoutLog[] = [
  {
    id: 1,
    datum: '2026-07-01',
    typ: 'cardio',
    eintraege: [
      { art: 'cardio', cardioType: 'laufband', dauerMin: 30, distanzKm: 5 }, // 10 km/h
      { art: 'cardio', cardioType: 'ergometer', dauerMin: 30 }, // ohne Distanz → ignorieren
    ],
  },
  {
    id: 2,
    datum: '2026-07-08',
    typ: 'cardio',
    eintraege: [{ art: 'cardio', cardioType: 'laufband', dauerMin: 30, distanzKm: 6 }], // 12 km/h
  },
]

describe('basisTempoKmh', () => {
  it('mittelt die Tempi der letzten Einheiten mit Dauer und Distanz', () => {
    expect(basisTempoKmh(LOGS, 'laufband')).toBeCloseTo(11, 5) // (10 + 12) / 2
  })

  it('nutzt nur die jüngsten maxEinheiten', () => {
    expect(basisTempoKmh(LOGS, 'laufband', 1)).toBeCloseTo(12, 5) // nur die neueste
  })

  it('liefert null ohne verwertbare Einheiten', () => {
    expect(basisTempoKmh(LOGS, 'ergometer')).toBeNull()
    expect(basisTempoKmh([], 'laufband')).toBeNull()
  })
})

describe('intervallTempo', () => {
  it('leitet Belastung (115–125 %) und Erholung (60–70 %) ab, auf 0,5 km/h gerundet', () => {
    const t = intervallTempo(10)
    expect(t.belastung).toEqual([11.5, 12.5])
    expect(t.erholung).toEqual([6, 7])
    expect(t.basisKmh).toBe(10)
  })

  it('rundet krumme Basistempi auf gerätesinnvolle Stufen', () => {
    const t = intervallTempo(9.3)
    expect(t.belastung).toEqual([10.5, 11.5]) // 10,695 / 11,625
    expect(t.erholung).toEqual([5.5, 6.5]) // 5,58 / 6,51
  })
})

describe('empfohlenesIntervallTempo', () => {
  it('kombiniert Basis und Faktoren, null ohne Daten', () => {
    const t = empfohlenesIntervallTempo(LOGS, 'laufband')
    expect(t?.basisKmh).toBe(11)
    expect(t?.belastung).toEqual([12.5, 14]) // 12,65 / 13,75
    expect(empfohlenesIntervallTempo(LOGS, 'crosstrainer')).toBeNull()
  })
})

describe('formatiereTempoBereich', () => {
  it('formatiert Bereiche und Einzelwerte deutsch', () => {
    expect(formatiereTempoBereich([11.5, 12.5])).toBe('11,5–12,5 km/h')
    expect(formatiereTempoBereich([6, 6])).toBe('6 km/h')
  })
})
