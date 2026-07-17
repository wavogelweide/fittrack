import { describe, expect, it } from 'vitest'
import type { TrainingsTag } from './vorschlag'
import {
  entwurfAusTag,
  entwurfZuLog,
  fasseWorkoutZusammen,
  formatiereSaetzeKompakt,
  formatiereSekunden,
  intervallGesamtSek,
  intervallStatus,
  leererEntwurf,
  mittlereWdh,
  tageSeitText,
  type WorkoutEntwurf,
} from './workout'

const TAG: TrainingsTag = {
  nr: 1,
  name: 'Ganzkörper A',
  kraft: [
    { exerciseId: 'brustpresse', saetze: 3, wdh: [8, 12], gewichtKg: 42.5, prioritaet: 'normal' },
    { exerciseId: 'rudermaschine', saetze: 4, wdh: [8, 12], gewichtKg: null, prioritaet: 'hoch' },
  ],
  cardio: { methode: 'intervall', titel: '60/120-Intervalle', beschreibung: '' },
  dehnen: [{ stretchId: 'kindhaltung' }, { stretchId: 'brust_tuerrahmen' }],
}

describe('entwurfAusTag', () => {
  it('stellt Aufwärmsätze voran und befüllt Arbeitssätze mit Gewicht und mittlerer Wdh.', () => {
    const e = entwurfAusTag(TAG, { kindhaltung: 45 })
    // 42,5 kg → 2 Aufwärmsätze (50 %/75 %) + 3 Arbeitssätze
    expect(e.kraft[0].saetze).toHaveLength(5)
    expect(e.kraft[0].saetze[0]).toEqual({
      gewichtKg: 22.5,
      wdh: 10,
      erledigt: false,
      aufwaermen: true,
    })
    expect(e.kraft[0].saetze[1]).toEqual({
      gewichtKg: 32.5,
      wdh: 5,
      erledigt: false,
      aufwaermen: true,
    })
    expect(e.kraft[0].saetze[2]).toEqual({ gewichtKg: 42.5, wdh: 10, erledigt: false })
    // ohne Arbeitsgewicht keine Aufwärmsätze
    expect(e.kraft[1].saetze).toHaveLength(4)
    expect(e.kraft[1].saetze[0].gewichtKg).toBeNull()
  })

  it('übernimmt Cardio-Methode und Haltedauer der Dehnübungen (Fallback 30 s)', () => {
    const e = entwurfAusTag(TAG, { kindhaltung: 45 })
    expect(e.cardio?.methode).toBe('intervall')
    expect(e.dehnen[0]).toEqual({ stretchId: 'kindhaltung', zielSek: 45, erledigt: false })
    expect(e.dehnen[1].zielSek).toBe(30)
  })
})

describe('mittlereWdh', () => {
  it('rundet die Mitte des Wiederholungsbereichs', () => {
    expect(mittlereWdh([8, 12])).toBe(10)
    expect(mittlereWdh([15, 20])).toBe(18)
    expect(mittlereWdh([3, 6])).toBe(5)
  })
})

describe('entwurfZuLog', () => {
  it('übernimmt nur erledigte Sätze mit gültigem Gewicht', () => {
    const entwurf: WorkoutEntwurf = {
      kraft: [
        {
          exerciseId: 'brustpresse',
          saetze: [
            { gewichtKg: 40, wdh: 10, erledigt: true },
            { gewichtKg: 40, wdh: 8, erledigt: false },
            { gewichtKg: null, wdh: 10, erledigt: true },
          ],
        },
        { exerciseId: 'latzug', saetze: [{ gewichtKg: 50, wdh: 10, erledigt: false }] },
      ],
      cardio: null,
      dehnen: [],
    }
    const log = entwurfZuLog(entwurf, '2026-07-10')
    expect(log?.typ).toBe('kraft')
    expect(log?.eintraege).toEqual([
      { art: 'kraft', exerciseId: 'brustpresse', saetze: [{ gewichtKg: 40, wdh: 10 }] },
    ])
  })

  it('übernimmt Cardio nur mit erfasster Dauer und Dehnen nur wenn erledigt', () => {
    const entwurf: WorkoutEntwurf = {
      kraft: [],
      cardio: { cardioType: 'ergometer', methode: 'ga1', dauerMin: 30, pulsAvg: 135 },
      dehnen: [
        { stretchId: 'kindhaltung', zielSek: 45, erledigt: true },
        { stretchId: 'brust_tuerrahmen', zielSek: 40, erledigt: false },
      ],
    }
    const log = entwurfZuLog(entwurf, '2026-07-10')
    expect(log?.typ).toBe('cardio')
    expect(log?.eintraege).toHaveLength(2)
    expect(log?.eintraege[0]).toMatchObject({ art: 'cardio', dauerMin: 30, pulsAvg: 135 })
    expect(log?.eintraege[1]).toEqual({ art: 'dehnen', stretchId: 'kindhaltung', dauerSek: 45 })
  })

  it('liefert null, wenn nichts erfasst wurde', () => {
    expect(entwurfZuLog(leererEntwurf(), '2026-07-10')).toBeNull()
    const nurCardioOhneDauer: WorkoutEntwurf = {
      kraft: [],
      cardio: { cardioType: 'laufband', methode: 'ga1' },
      dehnen: [],
    }
    expect(entwurfZuLog(nurCardioOhneDauer, '2026-07-10')).toBeNull()
  })

  it('setzt typ auf dehnen, wenn nur Dehnübungen erledigt sind', () => {
    const entwurf: WorkoutEntwurf = {
      kraft: [],
      cardio: null,
      dehnen: [{ stretchId: 'kindhaltung', zielSek: 45, erledigt: true }],
    }
    expect(entwurfZuLog(entwurf, '2026-07-10')?.typ).toBe('dehnen')
  })
})

describe('entwurfZuLog – Dauer', () => {
  it('übernimmt die Workout-Dauer, lässt sie ohne Wert weg', () => {
    const entwurf: WorkoutEntwurf = {
      kraft: [],
      cardio: null,
      dehnen: [{ stretchId: 'kindhaltung', zielSek: 45, erledigt: true }],
    }
    expect(entwurfZuLog(entwurf, '2026-07-12', 52)?.dauerMin).toBe(52)
    expect(entwurfZuLog(entwurf, '2026-07-12')?.dauerMin).toBeUndefined()
    expect(entwurfZuLog(entwurf, '2026-07-12', 0)?.dauerMin).toBeUndefined()
  })
})

describe('formatiereSaetzeKompakt', () => {
  it('fasst gleiche Sätze zusammen, listet ungleiche auf', () => {
    expect(
      formatiereSaetzeKompakt([
        { gewichtKg: 40, wdh: 12 },
        { gewichtKg: 40, wdh: 12 },
        { gewichtKg: 40, wdh: 12 },
      ]),
    ).toBe('3×12 @ 40 kg')
    expect(
      formatiereSaetzeKompakt([
        { gewichtKg: 40, wdh: 12 },
        { gewichtKg: 40, wdh: 10 },
      ]),
    ).toBe('40 kg: 12/10 Wdh.')
    expect(
      formatiereSaetzeKompakt([
        { gewichtKg: 20, wdh: 15 },
        { gewichtKg: 42.5, wdh: 10 },
      ]),
    ).toBe('20×15 · 42,5×10')
    expect(formatiereSaetzeKompakt([])).toBe('')
  })
})

describe('tageSeitText', () => {
  it('formatiert heute, gestern und vor X Tagen', () => {
    expect(tageSeitText('2026-07-12', '2026-07-12')).toBe('heute')
    expect(tageSeitText('2026-07-11', '2026-07-12')).toBe('gestern')
    expect(tageSeitText('2026-07-08', '2026-07-12')).toBe('vor 4 Tagen')
  })
})

describe('intervallStatus', () => {
  it('startet mit Belastung in Runde 1', () => {
    expect(intervallStatus(0, 8)).toEqual({
      phase: 'belastung',
      runde: 1,
      verbleibendSek: 60,
      gesamtVerbleibendSek: 8 * 180,
    })
  })

  it('wechselt nach 60 s in die Erholung und nach 180 s in die nächste Runde', () => {
    expect(intervallStatus(59, 8).phase).toBe('belastung')
    expect(intervallStatus(60, 8)).toMatchObject({ phase: 'erholung', runde: 1, verbleibendSek: 120 })
    expect(intervallStatus(179, 8)).toMatchObject({ phase: 'erholung', verbleibendSek: 1 })
    expect(intervallStatus(180, 8)).toMatchObject({ phase: 'belastung', runde: 2, verbleibendSek: 60 })
  })

  it('ist nach allen Runden fertig', () => {
    expect(intervallStatus(6 * 180 - 1, 6).phase).toBe('erholung')
    expect(intervallStatus(6 * 180, 6)).toEqual({
      phase: 'fertig',
      runde: 6,
      verbleibendSek: 0,
      gesamtVerbleibendSek: 0,
    })
    expect(intervallGesamtSek(6)).toBe(1080)
  })
})

describe('formatiereSekunden', () => {
  it('formatiert als M:SS', () => {
    expect(formatiereSekunden(0)).toBe('0:00')
    expect(formatiereSekunden(65)).toBe('1:05')
    expect(formatiereSekunden(600)).toBe('10:00')
  })
})

describe('fasseWorkoutZusammen', () => {
  it('summiert Sätze, Volumen, Cardio-Minuten und Dehnübungen', () => {
    const z = fasseWorkoutZusammen({
      eintraege: [
        {
          art: 'kraft',
          exerciseId: 'brustpresse',
          saetze: [
            { gewichtKg: 40, wdh: 10 },
            { gewichtKg: 40, wdh: 8 },
          ],
        },
        { art: 'cardio', cardioType: 'laufband', dauerMin: 30 },
        { art: 'dehnen', stretchId: 'kindhaltung', dauerSek: 45 },
      ],
    })
    expect(z).toEqual({
      kraftUebungen: 1,
      saetze: 2,
      volumenKg: 720,
      cardioMin: 30,
      dehnUebungen: 1,
    })
  })
})
