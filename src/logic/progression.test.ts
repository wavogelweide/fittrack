import { describe, expect, it } from 'vitest'
import type { WorkoutLog } from '../db/types'
import { geschaetztes1RM } from './einRM'
import { effektives1RM, PAUSEN_SEK, progressionsVorschlag } from './progression'

function log(id: number, datum: string, saetze: { gewichtKg: number; wdh: number }[]): WorkoutLog {
  return {
    id,
    datum,
    typ: 'kraft',
    eintraege: [{ art: 'kraft', exerciseId: 'brustpresse', saetze }],
  }
}

describe('progressionsVorschlag – doppelte Progression (Hypertrophie 8–12 Wdh.)', () => {
  it('ohne Historie: Basis-Arbeitsgewicht aus dem 1RM, null ohne Daten', () => {
    const basis = progressionsVorschlag('brustpresse', 'hypertrophie', 100, [])
    expect(basis.aktion).toBe('basis')
    expect(basis.gewichtKg).toBe(70) // 100 × 0,70 = 70

    expect(progressionsVorschlag('brustpresse', 'hypertrophie', null, []).gewichtKg).toBeNull()
  })

  it('steigert um 2,5 kg, wenn alle Sätze das obere Wdh.-Ende erreichen', () => {
    const logs = [log(1, '2026-07-08', [
      { gewichtKg: 40, wdh: 12 },
      { gewichtKg: 40, wdh: 12 },
      { gewichtKg: 40, wdh: 13 },
    ])]
    const v = progressionsVorschlag('brustpresse', 'hypertrophie', 55, logs)
    expect(v.aktion).toBe('steigern')
    expect(v.gewichtKg).toBe(42.5)
    expect(v.grund).toContain('+') // erwähnt die Steigerung
  })

  it('hält das Gewicht, solange die Wdh. im Bereich liegen', () => {
    const logs = [log(1, '2026-07-08', [
      { gewichtKg: 40, wdh: 12 },
      { gewichtKg: 40, wdh: 10 },
      { gewichtKg: 40, wdh: 9 },
    ])]
    const v = progressionsVorschlag('brustpresse', 'hypertrophie', 55, logs)
    expect(v.aktion).toBe('halten')
    expect(v.gewichtKg).toBe(40)
  })

  it('hält beim ersten Verfehlen, reduziert um 5 % beim zweiten in Folge', () => {
    const einmal = [log(2, '2026-07-08', [{ gewichtKg: 40, wdh: 6 }])]
    const v1 = progressionsVorschlag('brustpresse', 'hypertrophie', 55, einmal)
    expect(v1.aktion).toBe('halten')
    expect(v1.gewichtKg).toBe(40)

    const zweimal = [
      ...einmal,
      log(1, '2026-07-01', [
        { gewichtKg: 40, wdh: 7 },
        { gewichtKg: 40, wdh: 6 },
      ]),
    ]
    const v2 = progressionsVorschlag('brustpresse', 'hypertrophie', 55, zweimal)
    expect(v2.aktion).toBe('reduzieren')
    expect(v2.gewichtKg).toBe(37.5) // 40 × 0,95 = 38 → 37,5
  })

  it('bewertet nur die Arbeitssätze (schwerstes Gewicht), Aufwärmsätze zählen nicht', () => {
    const logs = [log(1, '2026-07-08', [
      { gewichtKg: 20, wdh: 15 }, // Aufwärmen
      { gewichtKg: 40, wdh: 12 },
      { gewichtKg: 40, wdh: 12 },
    ])]
    const v = progressionsVorschlag('brustpresse', 'hypertrophie', 55, logs)
    expect(v.aktion).toBe('steigern')
    expect(v.gewichtKg).toBe(42.5)
  })

  it('nutzt die jüngste Einheit als Referenz', () => {
    const logs = [
      log(1, '2026-07-01', [{ gewichtKg: 40, wdh: 12 }]),
      log(2, '2026-07-08', [{ gewichtKg: 42.5, wdh: 9 }]),
    ]
    const v = progressionsVorschlag('brustpresse', 'hypertrophie', 55, logs)
    expect(v.aktion).toBe('halten')
    expect(v.gewichtKg).toBe(42.5)
  })
})

describe('effektives1RM', () => {
  it('steigt mit der Trainingsleistung über das erfasste 1RM hinaus', () => {
    const logs = [log(1, '2026-07-08', [{ gewichtKg: 50, wdh: 10 }])]
    const erwartet = geschaetztes1RM(50, 10) // ≈ 65 > 60
    expect(effektives1RM(60, 'brustpresse', logs)).toBeCloseTo(erwartet, 5)
    expect(effektives1RM(80, 'brustpresse', logs)).toBe(80) // erfasstes 1RM ist höher
    expect(effektives1RM(null, 'brustpresse', [])).toBeNull()
  })
})

describe('PAUSEN_SEK', () => {
  it('folgt den üblichen Empfehlungen je Trainingsziel', () => {
    expect(PAUSEN_SEK.kraftausdauer).toBe(60)
    expect(PAUSEN_SEK.hypertrophie).toBe(90)
    expect(PAUSEN_SEK.kraft).toBe(180)
  })
})
