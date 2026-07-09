import { describe, expect, it } from 'vitest'
import { CARDIO_GERAETE, DEHN_UEBUNGEN, KRAFT_UEBUNGEN } from './seed'
import type { AntagonistGruppe } from './types'

describe('Seed-Daten', () => {
  it('enthält 20 Kraftübungen, 3 Cardio-Geräte, 15 Dehn- und 8 Blackroll-Übungen', () => {
    expect(KRAFT_UEBUNGEN).toHaveLength(20)
    expect(CARDIO_GERAETE).toHaveLength(3)
    expect(DEHN_UEBUNGEN.filter((u) => u.art === 'dehnen')).toHaveLength(15)
    expect(DEHN_UEBUNGEN.filter((u) => u.art === 'blackroll')).toHaveLength(8)
  })

  it('hat eindeutige IDs über alle Kataloge', () => {
    const ids = [
      ...KRAFT_UEBUNGEN.map((u) => u.id),
      ...CARDIO_GERAETE.map((g) => g.id),
      ...DEHN_UEBUNGEN.map((u) => u.id),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('enthält die drei Cardio-Typen laufband/ergometer/crosstrainer', () => {
    expect(CARDIO_GERAETE.map((g) => g.id).sort()).toEqual([
      'crosstrainer',
      'ergometer',
      'laufband',
    ])
  })

  it('jede Kraftübung hat Name, Maschine, mindestens einen Primärmuskel und eine Illustration', () => {
    for (const u of KRAFT_UEBUNGEN) {
      expect(u.name.length, u.id).toBeGreaterThan(0)
      expect(u.maschine.length, u.id).toBeGreaterThan(0)
      expect(u.primaerMuskeln.length, u.id).toBeGreaterThan(0)
      expect(u.illustrationId.length, u.id).toBeGreaterThan(0)
    }
  })

  it('jede Dehn-/Blackroll-Übung hat Zielmuskeln, Anleitung und Haltedauer', () => {
    for (const u of DEHN_UEBUNGEN) {
      expect(u.zielMuskeln.length, u.id).toBeGreaterThan(0)
      expect(u.anleitung.length, u.id).toBeGreaterThan(20)
      expect(u.halteDauerSek, u.id).toBeGreaterThan(0)
      expect(u.illustrationId.length, u.id).toBeGreaterThan(0)
    }
  })

  it('deckt alle Antagonisten-Paare für die Ratio-Analyse (Abschnitt 5.2) ab', () => {
    const gruppen = new Set(
      KRAFT_UEBUNGEN.map((u) => u.antagonistGruppe).filter(Boolean),
    )
    const erwartet: AntagonistGruppe[] = [
      'knie_strecker',
      'knie_beuger',
      'druck_horizontal',
      'zug_horizontal',
      'druck_vertikal',
      'zug_vertikal',
      'abduktion',
      'adduktion',
      'rumpf_bauch',
      'rumpf_ruecken',
    ]
    for (const g of erwartet) expect(gruppen.has(g), g).toBe(true)
  })
})
