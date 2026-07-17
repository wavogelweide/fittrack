import { describe, expect, it } from 'vitest'
import type { MaxWeight, WorkoutLog } from '../db/types'
import { geschaetztes1RM } from './einRM'
import { cardioBestwerte, kraftBestwerte, neueRekorde } from './rekorde'

const NAMEN = { brustpresse: 'Brustpresse', laufband: 'Laufband' }

const BISHER: WorkoutLog[] = [
  {
    id: 1,
    datum: '2026-07-01',
    typ: 'kraft',
    eintraege: [
      { art: 'kraft', exerciseId: 'brustpresse', saetze: [{ gewichtKg: 40, wdh: 10 }] },
      { art: 'cardio', cardioType: 'laufband', dauerMin: 30, distanzKm: 5 }, // 10 km/h
    ],
  },
]

const MAXW: MaxWeight[] = [
  { id: 1, exerciseId: 'brustpresse', gewichtKg: 45, wiederholungen: 3, datum: '2026-06-01' },
]

describe('kraftBestwerte / cardioBestwerte', () => {
  it('kombiniert Protokoll und Maximalgewicht-Verlauf', () => {
    const k = kraftBestwerte(BISHER, MAXW)
    expect(k.brustpresse.schwersterSatzKg).toBe(45)
    expect(k.brustpresse.bestes1RM).toBeCloseTo(
      Math.max(geschaetztes1RM(40, 10), geschaetztes1RM(45, 3)),
      5,
    )
    const c = cardioBestwerte(BISHER)
    expect(c.laufband).toMatchObject({ laengsteMin: 30, weitesteKm: 5, bestesTempoKmh: 10 })
  })
})

describe('neueRekorde', () => {
  it('meldet schwersten Satz und bestes 1RM, wenn Bestwerte übertroffen werden', () => {
    const neu = {
      eintraege: [
        {
          art: 'kraft' as const,
          exerciseId: 'brustpresse',
          saetze: [
            { gewichtKg: 47.5, wdh: 8 },
            { gewichtKg: 47.5, wdh: 6 },
          ],
        },
      ],
    }
    const r = neueRekorde(neu, BISHER, MAXW, NAMEN)
    expect(r).toHaveLength(2)
    expect(r[0]).toBe('Brustpresse: schwerster Satz 47,5 kg')
    expect(r[1]).toContain('bestes 1RM')
  })

  it('meldet keinen Rekord bei gleicher oder schwächerer Leistung', () => {
    const neu = {
      eintraege: [
        { art: 'kraft' as const, exerciseId: 'brustpresse', saetze: [{ gewichtKg: 45, wdh: 2 }] },
      ],
    }
    expect(neueRekorde(neu, BISHER, MAXW, NAMEN)).toEqual([])
  })

  it('erste Leistung einer Übung ist Basis, kein Rekord', () => {
    const neu = {
      eintraege: [
        { art: 'kraft' as const, exerciseId: 'latzug', saetze: [{ gewichtKg: 60, wdh: 10 }] },
      ],
    }
    expect(neueRekorde(neu, BISHER, MAXW, NAMEN)).toEqual([])
  })

  it('meldet Cardio-Rekorde für Dauer, Distanz und Tempo', () => {
    const neu = {
      eintraege: [
        { art: 'cardio' as const, cardioType: 'laufband' as const, dauerMin: 40, distanzKm: 7.5 },
      ],
    }
    // 40 Min > 30, 7,5 km > 5, 11,25 km/h > 10
    const r = neueRekorde(neu, BISHER, [], NAMEN)
    expect(r).toEqual([
      'Laufband: längste Einheit 40 Min.',
      'Laufband: weiteste Distanz 7,5 km',
      'Laufband: bestes Tempo 11,3 km/h',
    ])
  })
})
