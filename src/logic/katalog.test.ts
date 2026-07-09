import { describe, expect, it } from 'vitest'
import { CARDIO_GERAETE, DEHN_UEBUNGEN, KRAFT_UEBUNGEN } from '../db/seed'
import { filtereCardio, filtereDehnen, filtereKraft, passtZurSuche } from './katalog'

describe('passtZurSuche', () => {
  it('leerer Suchtext trifft immer', () => {
    expect(passtZurSuche('', ['Latzug'])).toBe(true)
    expect(passtZurSuche('   ', ['Latzug'])).toBe(true)
  })

  it('ist unabhängig von Groß-/Kleinschreibung', () => {
    expect(passtZurSuche('BRUST', ['Brustpresse'])).toBe(true)
    expect(passtZurSuche('brust', ['BRUSTPRESSE'])).toBe(true)
  })

  it('trifft nicht bei fehlendem Vorkommen', () => {
    expect(passtZurSuche('rudern', ['Brustpresse', 'Chest Press'])).toBe(false)
  })
})

describe('Katalog-Filter', () => {
  it('findet Kraftübungen über den Muskel-Namen', () => {
    const treffer = filtereKraft(KRAFT_UEBUNGEN, 'Latissimus')
    expect(treffer.map((u) => u.id)).toContain('latzug')
    expect(treffer.map((u) => u.id)).toContain('rudermaschine')
  })

  it('findet Kraftübungen über den Maschinennamen', () => {
    const treffer = filtereKraft(KRAFT_UEBUNGEN, 'leg curl')
    expect(treffer.map((u) => u.id)).toEqual(['beinbeuger'])
  })

  it('findet Dehnübungen mit Umlaut-Suche', () => {
    const treffer = filtereDehnen(DEHN_UEBUNGEN, 'gesäß')
    expect(treffer.length).toBeGreaterThan(0)
    expect(treffer.every((u) => u.zielMuskeln.includes('gesaess') || u.name.toLowerCase().includes('gesäß'))).toBe(true)
  })

  it('findet Blackroll-Übungen über die Art', () => {
    const treffer = filtereDehnen(DEHN_UEBUNGEN, 'blackroll')
    expect(treffer.length).toBeGreaterThanOrEqual(8)
    expect(treffer.filter((u) => u.art === 'blackroll')).toHaveLength(8)
  })

  it('filtert Cardio-Geräte nach Name', () => {
    expect(filtereCardio(CARDIO_GERAETE, 'laufband').map((g) => g.id)).toEqual(['laufband'])
    expect(filtereCardio(CARDIO_GERAETE, '')).toHaveLength(3)
  })
})
