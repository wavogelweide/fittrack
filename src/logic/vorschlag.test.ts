import { describe, expect, it } from 'vitest'
import type { Trainingsziel } from '../db/types'
import { berechneRatios, bewerteHaltung } from './analyse'
import { geschaetztes1RM } from './einRM'
import { erstelleWochenplan, type WochenplanInput } from './vorschlag'

const AUSGEWOGEN: Record<string, number> = {
  beinbeuger: 70,
  beinstrecker: 100,
  rudermaschine: 100,
  brustpresse: 100,
  latzug: 115,
  schulterpresse: 100,
  abduktoren_maschine: 100,
  adduktoren_maschine: 100,
  crunch_maschine: 85,
  rueckenstrecker_maschine: 100,
}

function baueInput(overrides: Partial<WochenplanInput> = {}): WochenplanInput {
  const einRMs = overrides.einRMs ?? AUSGEWOGEN
  const ratios = berechneRatios(einRMs)
  return {
    einRMs,
    ratios,
    muster: bewerteHaltung(ratios, undefined),
    trainingsziel: 'hypertrophie' as Trainingsziel,
    trainingstageProWoche: 3,
    ga1Zone: { von: 120, bis: 140 },
    ...overrides,
  }
}

describe('Wochenplan-Basis', () => {
  it('respektiert die Trainingstage (2–5) und wechselt Ganzkörper A/B ab', () => {
    for (const tage of [2, 3, 4, 5]) {
      const plan = erstelleWochenplan(baueInput({ trainingstageProWoche: tage }))
      expect(plan.tage).toHaveLength(tage)
    }
    const plan = erstelleWochenplan(baueInput())
    expect(plan.tage.map((t) => t.name)).toEqual(['Ganzkörper A', 'Ganzkörper B', 'Ganzkörper A'])
  })

  it('Cardio wechselt zwischen GA1 (mit Pulszone) und 60/120-Intervallen', () => {
    const plan = erstelleWochenplan(baueInput())
    expect(plan.tage.map((t) => t.cardio.methode)).toEqual(['ga1', 'intervall', 'ga1'])
    expect(plan.tage[0].cardio.beschreibung).toContain('120–140 bpm')
    expect(plan.tage[1].cardio.beschreibung).toContain('60 s')
  })

  it('berechnet konkrete Gewichte aus dem 1RM und passt sich Änderungen an', () => {
    const plan = erstelleWochenplan(baueInput())
    const latzug = plan.tage[1].kraft.find((k) => k.exerciseId === 'latzug')!
    expect(latzug.gewichtKg).toBe(80) // 115 × 0,70 = 80,5 → 80
    expect(latzug.wdh).toEqual([8, 12])
    expect(latzug.saetze).toBe(3)

    const staerker = erstelleWochenplan(baueInput({ einRMs: { ...AUSGEWOGEN, latzug: 130 } }))
    expect(staerker.tage[1].kraft.find((k) => k.exerciseId === 'latzug')!.gewichtKg).toBe(90)
  })

  it('ohne Maximalgewichte: Gewichte sind null und ein Hinweis erscheint', () => {
    const plan = erstelleWochenplan(baueInput({ einRMs: {}, ga1Zone: null }))
    expect(plan.tage[0].kraft.every((k) => k.gewichtKg === null)).toBe(true)
    expect(plan.hinweise.some((h) => h.includes('Maximalgewichte'))).toBe(true)
    expect(plan.hinweise.some((h) => h.includes('GA1-Pulszone'))).toBe(true)
  })
})

describe('Dysbalance-Priorisierung', () => {
  const einRMs = { ...AUSGEWOGEN, rudermaschine: 55 } // Zug:Druck horizontal deutlich schwach

  it('schwache Seite bekommt +1 Satz und hohe Priorität, starke Seite Erhaltung', () => {
    const plan = erstelleWochenplan(baueInput({ einRMs }))
    const rudern = plan.tage[0].kraft.find((k) => k.exerciseId === 'rudermaschine')!
    expect(rudern.saetze).toBe(4)
    expect(rudern.prioritaet).toBe('hoch')
    const brust = plan.tage[0].kraft.find((k) => k.exerciseId === 'brustpresse')!
    expect(brust.saetze).toBe(2)
    expect(brust.prioritaet).toBe('erhaltung')
  })

  it('dehnt die verkürzten Gegenspieler der schwachen Seite', () => {
    const plan = erstelleWochenplan(baueInput({ einRMs }))
    const stretchIds = plan.tage[0].dehnen.map((d) => d.stretchId)
    expect(stretchIds).toContain('brust_tuerrahmen')
    expect(stretchIds).toContain('br_bws')
  })

  it('ergänzt schwache Übungen außerhalb des Basisplans an A-Tagen', () => {
    const plan = erstelleWochenplan(
      baueInput({ einRMs: { ...AUSGEWOGEN, abduktoren_maschine: 60 } }),
    )
    const abduktoren = plan.tage[0].kraft.find((k) => k.exerciseId === 'abduktoren_maschine')
    expect(abduktoren?.prioritaet).toBe('hoch')
    expect(plan.tage[1].kraft.some((k) => k.exerciseId === 'abduktoren_maschine')).toBe(false)
  })
})

describe('Deload-Woche', () => {
  it('reduziert Sätze und Gewicht und markiert die Übungen', () => {
    const normal = erstelleWochenplan(baueInput())
    const deloadPlan = erstelleWochenplan(baueInput({ deload: true }))
    const brustNormal = normal.tage[0].kraft.find((k) => k.exerciseId === 'brustpresse')!
    const brustDeload = deloadPlan.tage[0].kraft.find((k) => k.exerciseId === 'brustpresse')!
    expect(brustDeload.saetze).toBeLessThan(brustNormal.saetze)
    expect(brustDeload.gewichtKg!).toBeLessThan(brustNormal.gewichtKg!)
    expect(brustDeload.deload).toBe(true)
    expect(brustDeload.progression).toBeUndefined()
    expect(deloadPlan.hinweise.some((h) => h.includes('Deload-Woche aktiv'))).toBe(true)
  })

  it('setzt in der Deload-Woche kein Dysbalance-Zusatzvolumen an', () => {
    const einRMs = { ...AUSGEWOGEN, rudermaschine: 55 }
    const plan = erstelleWochenplan(baueInput({ einRMs, deload: true }))
    const rudern = plan.tage[0].kraft.find((k) => k.exerciseId === 'rudermaschine')!
    expect(rudern.saetze).toBeLessThanOrEqual(2) // kein +1-Satz-Aufschlag
  })
})

describe('Plananpassungen', () => {
  it('ersetzt eine Basis-Übung und behält die Basis-Id für die UI', () => {
    const plan = erstelleWochenplan(baueInput({ planAnpassungen: { brustpresse: 'butterfly' } }))
    const tag = plan.tage[0].kraft
    expect(tag.some((k) => k.exerciseId === 'brustpresse')).toBe(false)
    const ersatz = tag.find((k) => k.exerciseId === 'butterfly')!
    expect(ersatz.basisId).toBe('brustpresse')
  })

  it('blendet eine ausgeblendete Übung (null) aus dem Plan aus', () => {
    const plan = erstelleWochenplan(baueInput({ planAnpassungen: { brustpresse: null } }))
    expect(plan.tage[0].kraft.some((k) => k.basisId === 'brustpresse')).toBe(false)
  })
})

describe('Haltungsblöcke', () => {
  it('Rundrücken: Reverse Fly + Brustdehnung/BWS-Rolle in jeder Einheit, Zug ≥ 2× Druck', () => {
    const ratios = berechneRatios({ ...AUSGEWOGEN, rudermaschine: 55 })
    const muster = bewerteHaltung(ratios, {
      sitzStundenProTag: 10,
      wandtestKopfErreichtWand: 'nein',
    })
    const plan = erstelleWochenplan(baueInput({ einRMs: { ...AUSGEWOGEN, rudermaschine: 55 }, ratios, muster }))
    for (const tag of plan.tage) {
      expect(tag.kraft.some((k) => k.exerciseId === 'reverse_fly')).toBe(true)
      const ids = tag.dehnen.map((d) => d.stretchId)
      expect(ids).toContain('brust_tuerrahmen')
      expect(ids).toContain('br_bws')
      const zug = tag.kraft
        .filter((k) => ['rudermaschine', 'latzug', 'reverse_fly'].includes(k.exerciseId))
        .reduce((s, k) => s + k.saetze, 0)
      const druck = tag.kraft
        .filter((k) => ['brustpresse', 'schulterpresse', 'dip_maschine'].includes(k.exerciseId))
        .reduce((s, k) => s + k.saetze, 0)
      expect(zug).toBeGreaterThanOrEqual(druck * 2)
    }
  })

  it('Hohlkreuz: Bauch/Gesäß in jeder Einheit, Hüftbeugerdehnung + täglicher Hinweis', () => {
    const ratios = berechneRatios(AUSGEWOGEN)
    const muster = bewerteHaltung(ratios, {
      sitzStundenProTag: 10,
      beckenKipptVorn: 'ja',
      lwsBeschwerden: 'ja',
    })
    const plan = erstelleWochenplan(baueInput({ ratios, muster }))
    for (const tag of plan.tage) {
      expect(tag.kraft.some((k) => k.exerciseId === 'crunch_maschine')).toBe(true)
      expect(tag.kraft.some((k) => k.exerciseId === 'glute_kickback')).toBe(true)
      expect(tag.dehnen.some((d) => d.stretchId === 'hueftbeuger_ausfallschritt')).toBe(true)
    }
    expect(plan.hinweise.some((h) => h.includes('täglich'))).toBe(true)
  })
})

describe('Konsistenz', () => {
  it('keine doppelten Übungen oder Dehnübungen pro Tag', () => {
    const ratios = berechneRatios({ ...AUSGEWOGEN, rudermaschine: 55, crunch_maschine: 40 })
    const muster = bewerteHaltung(ratios, {
      sitzStundenProTag: 10,
      wandtestKopfErreichtWand: 'nein',
      beckenKipptVorn: 'ja',
    })
    const plan = erstelleWochenplan(
      baueInput({ einRMs: { ...AUSGEWOGEN, rudermaschine: 55, crunch_maschine: 40 }, ratios, muster }),
    )
    for (const tag of plan.tage) {
      const kraftIds = tag.kraft.map((k) => k.exerciseId)
      expect(new Set(kraftIds).size).toBe(kraftIds.length)
      const dehnIds = tag.dehnen.map((d) => d.stretchId)
      expect(new Set(dehnIds).size).toBe(dehnIds.length)
    }
  })

  it('Arbeitsgewicht folgt dem Trainingsziel', () => {
    const kraftPlan = erstelleWochenplan(baueInput({ trainingsziel: 'kraft' }))
    const latzug = kraftPlan.tage[1].kraft.find((k) => k.exerciseId === 'latzug')!
    expect(latzug.gewichtKg).toBe(97.5) // 115 × 0,85 = 97,75 → 97,5
    expect(latzug.wdh).toEqual([3, 6])
  })
})

// Plausibilitätscheck: 1RM-Kette bis in den Plan
it('Plan nutzt das 1RM aus geschaetztes1RM konsistent', () => {
  const einRM = geschaetztes1RM(65, 8) // ≈ 81,5
  const plan = erstelleWochenplan(baueInput({ einRMs: { latzug: einRM } }))
  const latzug = plan.tage[1].kraft.find((k) => k.exerciseId === 'latzug')!
  expect(latzug.gewichtKg).toBe(57.5) // 81,5 × 0,7 ≈ 57,06 → 57,5
})
