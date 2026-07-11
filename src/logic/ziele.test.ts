import { describe, expect, it } from 'vitest'
import type { MaxWeight, WorkoutLog } from '../db/types'
import { geschaetztes1RM } from './einRM'
import {
  berechneZielFortschritt,
  bewerteAmbition,
  geschwindigkeitKmh,
  tageBisZiel,
  zielVergleichswert,
} from './ziele'

const MAX_WEIGHTS: MaxWeight[] = [
  { id: 1, exerciseId: 'brustpresse', gewichtKg: 50, wiederholungen: 8, datum: '2026-06-01' },
  { id: 2, exerciseId: 'brustpresse', gewichtKg: 55, wiederholungen: 8, datum: '2026-06-20' },
  { id: 3, exerciseId: 'latzug', gewichtKg: 60, wiederholungen: 5, datum: '2026-06-10' },
]

const LOGS: WorkoutLog[] = [
  {
    id: 1,
    datum: '2026-07-01',
    typ: 'kraft',
    eintraege: [
      {
        art: 'kraft',
        exerciseId: 'brustpresse',
        saetze: [
          { gewichtKg: 45, wdh: 10 },
          { gewichtKg: 50, wdh: 6 },
        ],
      },
      { art: 'cardio', cardioType: 'laufband', dauerMin: 25, distanzKm: 4 },
    ],
  },
  {
    id: 2,
    datum: '2026-07-08',
    typ: 'cardio',
    eintraege: [
      { art: 'cardio', cardioType: 'laufband', dauerMin: 35, distanzKm: 5.5 },
      { art: 'cardio', cardioType: 'ergometer', dauerMin: 60 },
    ],
  },
]

describe('berechneZielFortschritt – Kraft', () => {
  it('nimmt das beste 1RM aus MaxWeight-Verlauf und Trainingssätzen', () => {
    const f = berechneZielFortschritt(
      { typ: 'kraft_gewicht', referenz: 'brustpresse', zielwert: 80 },
      MAX_WEIGHTS,
      LOGS,
    )
    const erwartet = geschaetztes1RM(55, 8) // stärkster Wert
    expect(f.aktuell).toBeCloseTo(erwartet, 5)
    expect(f.prozent).toBe(Math.round((erwartet / 80) * 100))
    expect(f.erreicht).toBe(false)
    expect(f.einheit).toBe('kg')
    // drei Datumspunkte: 01.06., 20.06. (MaxWeight) und 01.07. (Workout-Sätze)
    expect(f.verlauf.map((p) => p.datum)).toEqual(['2026-06-01', '2026-06-20', '2026-07-01'])
  })

  it('verdichtet mehrere Sätze eines Tages auf den besten Wert', () => {
    const f = berechneZielFortschritt(
      { typ: 'kraft_gewicht', referenz: 'brustpresse', zielwert: 100 },
      [],
      LOGS,
    )
    expect(f.verlauf).toHaveLength(1)
    expect(f.verlauf[0].wert).toBeCloseTo(
      Math.max(geschaetztes1RM(45, 10), geschaetztes1RM(50, 6)),
      5,
    )
  })

  it('meldet erreicht, wenn der Bestwert den Zielwert übertrifft', () => {
    const f = berechneZielFortschritt(
      { typ: 'kraft_gewicht', referenz: 'latzug', zielwert: 65 },
      MAX_WEIGHTS,
      [],
    )
    expect(f.erreicht).toBe(true)
    expect(f.prozent).toBe(100)
  })
})

describe('berechneZielFortschritt – Cardio', () => {
  it('Cardio-Zeit: Bestwert der Einzel-Einheit pro Gerät', () => {
    const f = berechneZielFortschritt(
      { typ: 'cardio_zeit', referenz: 'laufband', zielwert: 40 },
      [],
      LOGS,
    )
    expect(f.aktuell).toBe(35)
    expect(f.prozent).toBe(88)
    expect(f.erreicht).toBe(false)
    expect(f.verlauf).toEqual([
      { datum: '2026-07-01', wert: 25 },
      { datum: '2026-07-08', wert: 35 },
    ])
  })

  it('Cardio-Distanz: ignoriert Einträge ohne Distanz', () => {
    const f = berechneZielFortschritt(
      { typ: 'cardio_distanz', referenz: 'ergometer', zielwert: 10 },
      [],
      LOGS,
    )
    expect(f.aktuell).toBeNull()
    expect(f.prozent).toBe(0)
  })

  it('zählt nur das referenzierte Gerät', () => {
    const f = berechneZielFortschritt(
      { typ: 'cardio_zeit', referenz: 'ergometer', zielwert: 45 },
      [],
      LOGS,
    )
    expect(f.aktuell).toBe(60)
    expect(f.erreicht).toBe(true)
  })
})

describe('berechneZielFortschritt – ohne Daten', () => {
  it('liefert null/0 ohne passende Einträge', () => {
    const f = berechneZielFortschritt(
      { typ: 'kraft_gewicht', referenz: 'beinpresse', zielwert: 100 },
      MAX_WEIGHTS,
      LOGS,
    )
    expect(f.aktuell).toBeNull()
    expect(f.prozent).toBe(0)
    expect(f.erreicht).toBe(false)
    expect(f.verlauf).toEqual([])
  })
})

describe('berechneZielFortschritt – Cardio-Leistung (Distanz in Zeit)', () => {
  // Ziel: 5 km in 30 Min. auf dem Laufband → Zielgeschwindigkeit 10 km/h
  const ziel = {
    typ: 'cardio_leistung' as const,
    referenz: 'laufband',
    zielwert: 5,
    zielDauerMin: 30,
  }

  it('misst den Fortschritt an der Durchschnittsgeschwindigkeit', () => {
    // 4 km in 30 Min. = 8 km/h → 80 % der Zielgeschwindigkeit
    const f = berechneZielFortschritt(ziel, [], LOGS)
    // LOGS: Laufband 25 Min/4 km (9,6 km/h) und 35 Min/5,5 km (9,43 km/h)
    expect(f.aktuell).toBeCloseTo(geschwindigkeitKmh(4, 25), 5)
    expect(f.zielVergleichswert).toBe(10)
    expect(f.prozent).toBe(96)
    expect(f.erreicht).toBe(false)
    expect(f.einheit).toBe('km/h')
  })

  it('gilt erst als erreicht, wenn die volle Distanz in der Zeit geschafft ist', () => {
    // schnell, aber zu kurz: 3 km in 15 Min. (12 km/h) → 99 % Deckel, nicht erreicht
    const kurz: WorkoutLog[] = [
      {
        id: 1,
        datum: '2026-07-09',
        typ: 'cardio',
        eintraege: [{ art: 'cardio', cardioType: 'laufband', dauerMin: 15, distanzKm: 3 }],
      },
    ]
    const f = berechneZielFortschritt(ziel, [], kurz)
    expect(f.erreicht).toBe(false)
    expect(f.prozent).toBe(99)

    // volle Distanz innerhalb der Zeit → erreicht
    const geschafft: WorkoutLog[] = [
      {
        id: 2,
        datum: '2026-07-10',
        typ: 'cardio',
        eintraege: [{ art: 'cardio', cardioType: 'laufband', dauerMin: 29, distanzKm: 5 }],
      },
    ]
    const f2 = berechneZielFortschritt(ziel, [], geschafft)
    expect(f2.erreicht).toBe(true)
    expect(f2.prozent).toBe(100)
  })

  it('ignoriert Einheiten ohne Distanz und liefert die Zielgeschwindigkeit', () => {
    const f = berechneZielFortschritt(
      { ...ziel, referenz: 'ergometer' }, // LOGS: Ergometer nur mit Dauer
      [],
      LOGS,
    )
    expect(f.aktuell).toBeNull()
    expect(f.prozent).toBe(0)
    expect(zielVergleichswert(ziel)).toBe(10)
    expect(zielVergleichswert({ ...ziel, zielDauerMin: undefined })).toBe(0)
  })
})

describe('bewerteAmbition', () => {
  it('stuft moderate Wochensteigerungen als realistisch ein', () => {
    // 1RM 100 → Ziel 106 in 12 Wochen ≈ 0,5 %/Woche
    const b = bewerteAmbition(
      { typ: 'kraft_gewicht', zielwert: 106, zieldatum: '2026-10-02' },
      100,
      '2026-07-10',
    )
    expect(b?.stufe).toBe('realistisch')
    expect(b?.steigerungProzent).toBe(6)
  })

  it('stuft große Sprünge in kurzer Zeit als sehr ambitioniert ein', () => {
    // +20 % in 4 Wochen = 5 %/Woche
    const b = bewerteAmbition(
      { typ: 'kraft_gewicht', zielwert: 120, zieldatum: '2026-08-07' },
      100,
      '2026-07-10',
    )
    expect(b?.stufe).toBe('sehr_ambitioniert')
  })

  it('nutzt bei Leistungszielen die Zielgeschwindigkeit', () => {
    // aktuell 9 km/h, Ziel 10 km/h in ~8 Wochen ≈ 1,4 %/Woche → ambitioniert
    const b = bewerteAmbition(
      { typ: 'cardio_leistung', zielwert: 5, zielDauerMin: 30, zieldatum: '2026-09-04' },
      9,
      '2026-07-10',
    )
    expect(b?.stufe).toBe('ambitioniert')
  })

  it('liefert null ohne Daten, ohne Datum, überfällig oder wenn schon geschafft', () => {
    expect(bewerteAmbition({ typ: 'kraft_gewicht', zielwert: 100, zieldatum: '2026-10-01' }, null, '2026-07-10')).toBeNull()
    expect(bewerteAmbition({ typ: 'kraft_gewicht', zielwert: 100 }, 90, '2026-07-10')).toBeNull()
    expect(bewerteAmbition({ typ: 'kraft_gewicht', zielwert: 100, zieldatum: '2026-07-01' }, 90, '2026-07-10')).toBeNull()
    expect(bewerteAmbition({ typ: 'kraft_gewicht', zielwert: 100, zieldatum: '2026-10-01' }, 105, '2026-07-10')).toBeNull()
  })
})

describe('tageBisZiel', () => {
  it('berechnet verbleibende Tage, überfällig und ohne Datum', () => {
    expect(tageBisZiel('2026-07-20', '2026-07-10')).toBe(10)
    expect(tageBisZiel('2026-07-10', '2026-07-10')).toBe(0)
    expect(tageBisZiel('2026-07-01', '2026-07-10')).toBe(-9)
    expect(tageBisZiel(undefined, '2026-07-10')).toBeNull()
  })
})
