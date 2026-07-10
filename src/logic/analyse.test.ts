import { describe, expect, it } from 'vitest'
import type { MaxWeight } from '../db/types'
import { einRMProUebung, geschaetztes1RM } from './einRM'
import { berechneRatios, bewerteHaltung, RATIO_KONFIGS } from './analyse'

const AUSGEWOGEN: Record<string, number> = {
  beinbeuger: 70,
  beinstrecker: 100, // 0,70 → im Richtwert 0,6–0,75
  rudermaschine: 100,
  brustpresse: 100, // 1,0 → im Richtwert 0,9–1,1
  latzug: 115,
  schulterpresse: 100, // 1,15 → im Richtwert 1,0–1,3
  abduktoren_maschine: 100,
  adduktoren_maschine: 100, // 1,0
  crunch_maschine: 85,
  rueckenstrecker_maschine: 100, // 0,85 → im Richtwert 0,7–1,0
}

describe('Ratio-Engine (Szenario 1: ausgewogen)', () => {
  it('alle fünf Paare sind ok, keine Haltungsauffälligkeit', () => {
    const ratios = berechneRatios(AUSGEWOGEN)
    expect(ratios).toHaveLength(RATIO_KONFIGS.length)
    expect(ratios.every((r) => r.status === 'ok')).toBe(true)
    const muster = bewerteHaltung(ratios, undefined)
    expect(muster.every((m) => m.stufe === 'unauffaellig')).toBe(true)
    expect(muster[0].datenlage).toBe('nur_ratios')
  })
})

describe('Ratio-Engine (Szenario 2: Schweregrade)', () => {
  it('15–30 % unter dem Richtwert → leicht, Zähler schwach', () => {
    const ratios = berechneRatios({ ...AUSGEWOGEN, rudermaschine: 70 }) // 0,70 vs. min 0,9 → 22 %
    const r = ratios.find((x) => x.konfig.id === 'zug_druck_horizontal')!
    expect(r.status).toBe('leicht')
    expect(r.richtung).toBe('zaehler_schwach')
    expect(r.abweichungProzent).toBe(22)
  })

  it('>30 % unter dem Richtwert → deutlich', () => {
    const ratios = berechneRatios({ ...AUSGEWOGEN, rudermaschine: 55 }) // 0,55 → 39 %
    const r = ratios.find((x) => x.konfig.id === 'zug_druck_horizontal')!
    expect(r.status).toBe('deutlich')
  })

  it('über dem Richtwert → Nenner schwach', () => {
    const ratios = berechneRatios({ ...AUSGEWOGEN, latzug: 150 }) // 1,5 vs. max 1,3 → 15,4 %
    const r = ratios.find((x) => x.konfig.id === 'zug_druck_vertikal')!
    expect(r.status).toBe('leicht')
    expect(r.richtung).toBe('nenner_schwach')
  })
})

describe('Fehlende Daten (Szenario 3)', () => {
  it('ohne Maximalgewichte sind alle Ratios fehlend und nennen die Übungen', () => {
    const ratios = berechneRatios({})
    expect(ratios.every((r) => r.status === 'fehlend')).toBe(true)
    const horizontal = ratios.find((x) => x.konfig.id === 'zug_druck_horizontal')!
    expect(horizontal.fehlendeExerciseIds).toEqual(['rudermaschine', 'brustpresse'])
  })

  it('Haltungsmuster funktioniert allein mit dem Selbstcheck (DoD)', () => {
    const muster = bewerteHaltung(berechneRatios({}), {
      sitzStundenProTag: 10,
      wandtestKopfErreichtWand: 'nein',
      schulternFallenVorn: 'ja',
    })
    const rund = muster.find((m) => m.muster === 'rundruecken')!
    expect(rund.datenlage).toBe('nur_selbstcheck')
    expect(rund.score).toBe(65) // 20 + 25 + 20
    expect(rund.stufe).toBe('wahrscheinlich')
    expect(rund.signale).toHaveLength(3)
  })
})

describe('Haltungsmuster (Szenarien 4–5)', () => {
  it('Rundrücken aus Ratio-Signal allein → möglich', () => {
    const ratios = berechneRatios({ ...AUSGEWOGEN, rudermaschine: 55 }) // deutlich → 35 Punkte
    const rund = bewerteHaltung(ratios, undefined).find((m) => m.muster === 'rundruecken')!
    expect(rund.score).toBe(35)
    expect(rund.stufe).toBe('moeglich')
  })

  it('Hohlkreuz aus Ratios + Selbstcheck kombiniert → wahrscheinlich', () => {
    const ratios = berechneRatios({
      ...AUSGEWOGEN,
      crunch_maschine: 55, // 0,55 vs. min 0,7 → 21 % → leicht (+20)
      beinbeuger: 45, // 0,45 vs. min 0,6 → 25 % → leicht (+10)
    })
    const hohl = bewerteHaltung(ratios, {
      sitzStundenProTag: 7, // +10
      beckenKipptVorn: 'ja', // +25
      lwsBeschwerden: 'ja', // +10
    }).find((m) => m.muster === 'hohlkreuz')!
    expect(hohl.score).toBe(75)
    expect(hohl.stufe).toBe('wahrscheinlich')
    expect(hohl.datenlage).toBe('beides')
    expect(hohl.signale).toHaveLength(5)
  })

  it('ohne jede Datenbasis: unauffällig mit Datenlage "keine"', () => {
    const muster = bewerteHaltung(berechneRatios({}), undefined)
    expect(muster.every((m) => m.stufe === 'unauffaellig' && m.datenlage === 'keine')).toBe(true)
  })
})

describe('einRMProUebung', () => {
  it('nimmt je Übung den jüngsten Eintrag', () => {
    const eintraege: MaxWeight[] = [
      { id: 1, exerciseId: 'latzug', gewichtKg: 60, wiederholungen: 8, datum: '2026-07-01' },
      { id: 2, exerciseId: 'latzug', gewichtKg: 65, wiederholungen: 8, datum: '2026-07-10' },
      { id: 3, exerciseId: 'brustpresse', gewichtKg: 80, wiederholungen: 5, datum: '2026-07-05' },
    ]
    const map = einRMProUebung(eintraege)
    expect(map.latzug).toBeCloseTo(geschaetztes1RM(65, 8), 5)
    expect(map.brustpresse).toBeCloseTo(geschaetztes1RM(80, 5), 5)
    expect(Object.keys(map)).toHaveLength(2)
  })
})
