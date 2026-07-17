import { describe, expect, it } from 'vitest'
import { KRAFT_UEBUNGEN } from '../db/seed'
import { alternativeUebungen, anzahlAnpassungen, setzeAnpassung } from './planAnpassung'

describe('alternativeUebungen', () => {
  it('schlägt Übungen mit gleichem Bewegungstyp und gemeinsamem Primärmuskel vor', () => {
    const alt = alternativeUebungen('brustpresse', KRAFT_UEBUNGEN)
    const ids = alt.map((u) => u.id)
    expect(ids).not.toContain('brustpresse') // nicht sich selbst
    // Butterfly ist push + Brust → passende Alternative
    expect(ids).toContain('butterfly')
    // Latzug ist pull → keine Alternative zur Brustpresse
    expect(ids).not.toContain('latzug')
    // alle Vorschläge teilen den Bewegungstyp der Basis
    const basis = KRAFT_UEBUNGEN.find((u) => u.id === 'brustpresse')!
    expect(alt.every((u) => u.bewegungsTyp === basis.bewegungsTyp)).toBe(true)
  })

  it('liefert eine leere Liste für unbekannte Übungen', () => {
    expect(alternativeUebungen('gibtsnicht', KRAFT_UEBUNGEN)).toEqual([])
  })
})

describe('setzeAnpassung / anzahlAnpassungen', () => {
  it('setzt Ersatz, blendet aus (null) und entfernt (undefined)', () => {
    let a = setzeAnpassung(undefined, 'brustpresse', 'butterfly')
    expect(a).toEqual({ brustpresse: 'butterfly' })
    expect(anzahlAnpassungen(a)).toBe(1)

    a = setzeAnpassung(a, 'latzug', null) // ausblenden
    expect(a).toEqual({ brustpresse: 'butterfly', latzug: null })
    expect(anzahlAnpassungen(a)).toBe(2)

    a = setzeAnpassung(a, 'brustpresse', undefined) // zurücksetzen
    expect(a).toEqual({ latzug: null })
    expect(anzahlAnpassungen(a)).toBe(1)
  })

  it('verändert das Ausgangsobjekt nicht', () => {
    const original = { brustpresse: 'butterfly' }
    setzeAnpassung(original, 'latzug', null)
    expect(original).toEqual({ brustpresse: 'butterfly' })
  })
})
