import { describe, expect, it } from 'vitest'
import type { KoerperMessung } from '../db/types'
import { letzteMessung, pruefeMessung, sortiereMessungen, veraenderung } from './koerperdaten'

const MESSUNGEN: KoerperMessung[] = [
  { id: 2, datum: '2026-07-01', gewichtKg: 82.5, fettProzent: 22 },
  { id: 1, datum: '2026-06-01', gewichtKg: 84, fettProzent: 23.5 },
  { id: 3, datum: '2026-07-15', gewichtKg: 81.8 },
]

describe('sortiereMessungen / letzteMessung', () => {
  it('sortiert chronologisch und findet die neueste Messung', () => {
    expect(sortiereMessungen(MESSUNGEN).map((m) => m.id)).toEqual([1, 2, 3])
    expect(letzteMessung(MESSUNGEN)?.gewichtKg).toBe(81.8)
    expect(letzteMessung([])).toBeNull()
  })
})

describe('veraenderung', () => {
  it('bildet die Differenz von der ersten zur letzten Messung', () => {
    const v = veraenderung(MESSUNGEN)!
    expect(v.gewichtKg).toBe(-2.2)
    expect(v.fettProzent).toBe(-1.5) // nur Einträge mit KFA-Wert
    expect(v.seit).toBe('2026-06-01')
  })

  it('liefert null bei weniger als zwei Messungen, KFA null ohne zwei KFA-Werte', () => {
    expect(veraenderung([MESSUNGEN[0]])).toBeNull()
    const ohneFett = MESSUNGEN.map((m) => ({ ...m, fettProzent: undefined }))
    expect(veraenderung(ohneFett)!.fettProzent).toBeNull()
  })
})

describe('pruefeMessung', () => {
  it('verlangt ein plausibles Gewicht, KFA optional in Grenzen', () => {
    expect(pruefeMessung(82.5, undefined)).toBeNull()
    expect(pruefeMessung(82.5, 22)).toBeNull()
    expect(pruefeMessung(undefined, 22)).toMatch(/Gewicht/)
    expect(pruefeMessung(0, undefined)).toMatch(/Gewicht/)
    expect(pruefeMessung(500, undefined)).toMatch(/Gewicht/)
    expect(pruefeMessung(82.5, 80)).toMatch(/Körperfettanteil/)
  })
})
