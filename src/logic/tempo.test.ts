import { describe, expect, it } from 'vitest'
import type { Goal, WorkoutLog } from '../db/types'
import {
  basisTempoKmh,
  empfohlenesIntervallTempo,
  formatiereTempoBereich,
  intervallTempo,
  intervallVorgabe,
  passendesLeistungsziel,
  wochenZielTempo,
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

describe('wochenZielTempo', () => {
  it('interpoliert einen Wochen-Schritt vom aktuellen Niveau zum Ziel', () => {
    // Basis 8 km/h, Ziel 10 km/h, 4 Wochen → +0,5 pro Woche → 8,5
    expect(wochenZielTempo(8, 10, 28)).toBe(8.5)
    // 2 Wochen → +1 → 9
    expect(wochenZielTempo(8, 10, 14)).toBe(9)
  })

  it('gibt das Zieltempo direkt vor, wenn Niveau erreicht, keine Basis oder Datum verstrichen', () => {
    expect(wochenZielTempo(10.5, 10, 28)).toBe(10) // schon am Ziel
    expect(wochenZielTempo(null, 10, 28)).toBe(10) // keine Daten
    expect(wochenZielTempo(8, 10, 0)).toBe(10) // Zieldatum erreicht → volles Ziel
  })
})

// Ziel: 5 km in 30 Min. (10 km/h) auf dem Laufband
const ZIEL: Goal = {
  id: 1,
  typ: 'cardio_leistung',
  referenz: 'laufband',
  zielwert: 5,
  zielDauerMin: 30,
  zieldatum: '2026-08-08', // 4 Wochen nach dem 11.07.
  status: 'aktiv',
}

describe('passendesLeistungsziel', () => {
  it('findet nur aktive Leistungsziele des Geräts, nächstes Datum zuerst', () => {
    const spaeter: Goal = { ...ZIEL, id: 2, zieldatum: '2026-12-01' }
    const erreicht: Goal = { ...ZIEL, id: 3, status: 'erreicht' }
    const anderesGeraet: Goal = { ...ZIEL, id: 4, referenz: 'ergometer' }
    expect(passendesLeistungsziel([spaeter, erreicht, anderesGeraet, ZIEL], 'laufband')?.id).toBe(1)
    expect(passendesLeistungsziel([erreicht], 'laufband')).toBeNull()
  })
})

describe('intervallVorgabe', () => {
  it('leitet die Tempi aus Ziel und Zieldatum ab (Wochenziel als Basis)', () => {
    // LOGS: Laufband-Basis 11 km/h > Ziel 10 → Wochenziel = Zieltempo 10
    const v = intervallVorgabe(LOGS, [ZIEL], 'laufband', '2026-07-11')!
    expect(v.quelle).toBe('ziel')
    expect(v.wochenZielKmh).toBe(10)
    expect(v.belastung).toEqual([11.5, 12.5]) // 10 × 1,15/1,25
    expect(v.erholung).toEqual([6, 7])
    expect(v.zielKmh).toBe(10)
  })

  it('interpoliert unterhalb des Ziels: Basis 8, Ziel 10, 4 Wochen → Wochenziel 8,5', () => {
    const langsam: WorkoutLog[] = [
      {
        id: 1,
        datum: '2026-07-08',
        typ: 'cardio',
        eintraege: [{ art: 'cardio', cardioType: 'laufband', dauerMin: 30, distanzKm: 4 }], // 8 km/h
      },
    ]
    const v = intervallVorgabe(langsam, [ZIEL], 'laufband', '2026-07-11')!
    expect(v.wochenZielKmh).toBe(8.5)
    expect(v.belastung).toEqual([10, 10.5]) // 9,775 / 10,625 auf 0,5 gerundet
  })

  it('fällt ohne Ziel auf den Durchschnitt zurück, null ganz ohne Daten', () => {
    const v = intervallVorgabe(LOGS, [], 'laufband', '2026-07-11')!
    expect(v.quelle).toBe('durchschnitt')
    expect(v.basisKmh).toBe(11)
    expect(intervallVorgabe([], [], 'crosstrainer', '2026-07-11')).toBeNull()
  })

  it('funktioniert mit Ziel auch ganz ohne Trainingsdaten (trainiert am Zieltempo)', () => {
    const v = intervallVorgabe([], [ZIEL], 'laufband', '2026-07-11')!
    expect(v.quelle).toBe('ziel')
    expect(v.wochenZielKmh).toBe(10)
  })
})

describe('formatiereTempoBereich', () => {
  it('formatiert Bereiche und Einzelwerte deutsch', () => {
    expect(formatiereTempoBereich([11.5, 12.5])).toBe('11,5–12,5 km/h')
    expect(formatiereTempoBereich([6, 6])).toBe('6 km/h')
  })
})
