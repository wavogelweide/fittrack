import { describe, expect, it } from 'vitest'
import {
  heutigerPlanTag,
  standardWochentage,
  wochentagFuerPlanTag,
  wochentagIndex,
} from './trainingstage'

describe('wochentagIndex', () => {
  it('liefert 0 für Montag bis 6 für Sonntag', () => {
    expect(wochentagIndex('2026-07-13')).toBe(0) // Montag
    expect(wochentagIndex('2026-07-16')).toBe(3) // Donnerstag
    expect(wochentagIndex('2026-07-19')).toBe(6) // Sonntag
  })
})

describe('standardWochentage', () => {
  it('verteilt die Trainingstage gleichmäßig über die Woche', () => {
    expect(standardWochentage(2)).toEqual([0, 3])
    expect(standardWochentage(3)).toEqual([0, 2, 4])
    expect(standardWochentage(4)).toEqual([0, 1, 3, 4])
    expect(standardWochentage(5)).toEqual([0, 1, 2, 3, 4])
  })

  it('begrenzt unplausible Werte auf 2–5', () => {
    expect(standardWochentage(1)).toEqual([0, 3])
    expect(standardWochentage(9)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('heutigerPlanTag', () => {
  const MO_MI_FR = [0, 2, 4]

  it('ordnet den heutigen Wochentag dem passenden Plan-Tag zu', () => {
    expect(heutigerPlanTag(MO_MI_FR, '2026-07-13', 3)).toBe(1) // Montag → Tag 1
    expect(heutigerPlanTag(MO_MI_FR, '2026-07-15', 3)).toBe(2) // Mittwoch → Tag 2
    expect(heutigerPlanTag(MO_MI_FR, '2026-07-17', 3)).toBe(3) // Freitag → Tag 3
  })

  it('liefert null an trainingsfreien Tagen', () => {
    expect(heutigerPlanTag(MO_MI_FR, '2026-07-14', 3)).toBeNull() // Dienstag
    expect(heutigerPlanTag([], '2026-07-13', 3)).toBeNull()
  })

  it('wiederholt den Plan, wenn mehr Wochentage als Plan-Tage gewählt sind', () => {
    // 4 Wochentage, aber nur 2 Plan-Tage → Do (Index 2) wieder Tag 1
    expect(heutigerPlanTag([0, 1, 3, 4], '2026-07-16', 2)).toBe(1)
  })

  it('sortiert unsortierte Auswahl und ignoriert Duplikate', () => {
    expect(heutigerPlanTag([4, 0, 2, 0], '2026-07-15', 3)).toBe(2)
  })
})

describe('wochentagFuerPlanTag', () => {
  it('liefert das Kürzel des zugeordneten Wochentags', () => {
    expect(wochentagFuerPlanTag([0, 2, 4], 1)).toBe('Mo')
    expect(wochentagFuerPlanTag([0, 2, 4], 3)).toBe('Fr')
  })

  it('liefert null ohne Zuordnung', () => {
    expect(wochentagFuerPlanTag([0, 2], 3)).toBeNull()
    expect(wochentagFuerPlanTag([], 1)).toBeNull()
  })
})
