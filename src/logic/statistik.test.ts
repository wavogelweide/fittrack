import { describe, expect, it } from 'vitest'
import type { WorkoutLog } from '../db/types'
import {
  aktuelleSerie,
  montagDerWoche,
  saetzeNachBewegungsTyp,
  vorWochen,
  wochenStatistik,
} from './statistik'

function kraftLog(id: number, datum: string): WorkoutLog {
  return {
    id,
    datum,
    typ: 'kraft',
    eintraege: [
      {
        art: 'kraft',
        exerciseId: 'brustpresse',
        saetze: [
          { gewichtKg: 40, wdh: 10 },
          { gewichtKg: 40, wdh: 10 },
        ],
      },
      { art: 'cardio', cardioType: 'laufband', dauerMin: 30 },
    ],
  }
}

describe('montagDerWoche', () => {
  it('liefert den Montag der Kalenderwoche (Mo–So)', () => {
    expect(montagDerWoche('2026-07-11')).toBe('2026-07-06') // Samstag → Montag davor
    expect(montagDerWoche('2026-07-06')).toBe('2026-07-06') // Montag bleibt
    expect(montagDerWoche('2026-07-12')).toBe('2026-07-06') // Sonntag gehört noch zur Woche
    expect(montagDerWoche('2026-07-13')).toBe('2026-07-13') // nächster Montag
  })
})

describe('wochenStatistik', () => {
  it('summiert Einheiten, Sätze, Volumen und Cardio je Kalenderwoche', () => {
    const logs = [kraftLog(1, '2026-07-07'), kraftLog(2, '2026-07-09'), kraftLog(3, '2026-06-30')]
    const wochen = wochenStatistik(logs, '2026-07-11', 3)
    expect(wochen).toHaveLength(3)
    expect(wochen[2]).toMatchObject({
      montag: '2026-07-06',
      einheiten: 2,
      saetze: 4,
      volumenKg: 1600,
      cardioMin: 60,
    })
    expect(wochen[1]).toMatchObject({ montag: '2026-06-29', einheiten: 1, volumenKg: 800 })
    expect(wochen[0]).toMatchObject({ montag: '2026-06-22', einheiten: 0, volumenKg: 0 })
  })
})

describe('aktuelleSerie', () => {
  it('zählt zusammenhängende Trainingswochen bis heute', () => {
    const logs = [kraftLog(1, '2026-07-07'), kraftLog(2, '2026-06-30'), kraftLog(3, '2026-06-24')]
    expect(aktuelleSerie(logs, '2026-07-11')).toBe(3)
  })

  it('eine noch leere aktuelle Woche bricht die Serie nicht', () => {
    const logs = [kraftLog(1, '2026-07-03'), kraftLog(2, '2026-06-24')]
    // heute = 11.07. (Woche ab 06.07. ohne Training) → Serie der Vorwochen zählt
    expect(aktuelleSerie(logs, '2026-07-11')).toBe(2)
  })

  it('eine Lücke beendet die Serie, ohne Trainings ist sie 0', () => {
    const logs = [kraftLog(1, '2026-07-07'), kraftLog(2, '2026-06-16')]
    expect(aktuelleSerie(logs, '2026-07-11')).toBe(1)
    expect(aktuelleSerie([], '2026-07-11')).toBe(0)
  })
})

describe('saetzeNachBewegungsTyp', () => {
  it('zählt Sätze je Bewegungstyp ab dem Stichtag', () => {
    const typen = { brustpresse: 'push' as const }
    const logs = [kraftLog(1, '2026-07-07'), kraftLog(2, '2026-06-01')]
    const s = saetzeNachBewegungsTyp(logs, typen, '2026-06-14')
    expect(s.push).toBe(2) // nur die Einheit nach dem Stichtag
    expect(s.pull).toBe(0)
  })
})

describe('vorWochen', () => {
  it('rechnet n Wochen zurück', () => {
    expect(vorWochen('2026-07-11', 4)).toBe('2026-06-13')
  })
})
