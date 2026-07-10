import { describe, expect, it } from 'vitest'
import type { MaxWeight } from '../db/types'
import {
  aktuellster1RM,
  arbeitsgewicht,
  brzycki1RM,
  epley1RM,
  geschaetztes1RM,
  rundeAufStufe,
} from './einRM'

describe('1RM-Formeln', () => {
  it('Epley: 100 kg × 10 Wdh. ≈ 133,3 kg', () => {
    expect(epley1RM(100, 10)).toBeCloseTo(133.33, 1)
  })

  it('Brzycki: 100 kg × 10 Wdh. ≈ 133,3 kg', () => {
    expect(brzycki1RM(100, 10)).toBeCloseTo(133.33, 1)
  })

  it('bei 1 Wiederholung ist das 1RM das Gewicht selbst', () => {
    expect(epley1RM(120, 1)).toBe(120)
    expect(brzycki1RM(120, 1)).toBe(120)
    expect(geschaetztes1RM(120, 1)).toBe(120)
  })

  it('geschätztes 1RM ist das Mittel beider Formeln', () => {
    const g = geschaetztes1RM(80, 5)
    expect(g).toBeCloseTo((epley1RM(80, 5) + brzycki1RM(80, 5)) / 2, 5)
  })

  it('Brzycki bleibt bei sehr hohen Wiederholungszahlen stabil', () => {
    expect(brzycki1RM(50, 40)).toBeGreaterThan(0)
    expect(Number.isFinite(brzycki1RM(50, 40))).toBe(true)
  })
})

describe('Arbeitsgewicht', () => {
  it('rundet auf 2,5-kg-Stufen', () => {
    expect(rundeAufStufe(93.3)).toBe(92.5)
    expect(rundeAufStufe(94.0)).toBe(95)
    expect(rundeAufStufe(41.2, 5)).toBe(40)
  })

  it('Hypertrophie: 65–75 % 1RM, 8–12 Wdh.', () => {
    const a = arbeitsgewicht(140, 'hypertrophie')
    expect(a.empfohlenKg).toBe(97.5) // 140 × 0,70 = 98 → 97,5
    expect(a.vonKg).toBe(90) // 140 × 0,65 = 91 → 90
    expect(a.bisKg).toBe(105)
    expect(a.wdh).toEqual([8, 12])
  })

  it('Kraftausdauer und Maximalkraft nutzen ihre Bereiche', () => {
    expect(arbeitsgewicht(100, 'kraftausdauer').empfohlenKg).toBe(55)
    expect(arbeitsgewicht(100, 'kraft').empfohlenKg).toBe(85)
  })
})

describe('aktuellster1RM', () => {
  const e = (id: number, datum: string, gewichtKg: number, wdh: number): MaxWeight => ({
    id,
    exerciseId: 'latzug',
    gewichtKg,
    wiederholungen: wdh,
    datum,
  })

  it('nimmt den Eintrag mit dem jüngsten Datum', () => {
    const einRM = aktuellster1RM([e(1, '2026-07-01', 100, 5), e(2, '2026-06-01', 200, 5)])
    expect(einRM).toBeCloseTo(geschaetztes1RM(100, 5), 5)
  })

  it('liefert null ohne Einträge', () => {
    expect(aktuellster1RM([])).toBeNull()
  })
})
