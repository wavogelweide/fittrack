import { describe, expect, it } from 'vitest'
import type { Exercise } from '../db/types'
import { erstelleEigeneUebung, istEigeneUebung, vereinigeUebungen } from './eigeneUebungen'

describe('erstelleEigeneUebung', () => {
  it('baut eine gültige Übung mit eindeutiger Id und eigene-Flag', () => {
    const e = erstelleEigeneUebung(
      { name: '  Hip Thrust Maschine ', bewegungsTyp: 'legs_back', primaerMuskeln: ['gesaess'] },
      1234,
    )
    expect(e.ok).toBe(true)
    if (!e.ok) return
    expect(e.uebung).toMatchObject({
      id: 'eigene_1234',
      name: 'Hip Thrust Maschine',
      maschine: 'Hip Thrust Maschine',
      bewegungsTyp: 'legs_back',
      primaerMuskeln: ['gesaess'],
      eigene: true,
    })
    expect(istEigeneUebung(e.uebung.id)).toBe(true)
    expect(istEigeneUebung('brustpresse')).toBe(false)
  })

  it('dedupliziert Muskeln und nimmt Primärmuskeln aus den sekundären heraus', () => {
    const e = erstelleEigeneUebung(
      {
        name: 'Test',
        bewegungsTyp: 'push',
        primaerMuskeln: ['brust', 'brust'],
        sekundaerMuskeln: ['brust', 'trizeps'],
      },
      1,
    )
    if (!e.ok) throw new Error(e.fehler)
    expect(e.uebung.primaerMuskeln).toEqual(['brust'])
    expect(e.uebung.sekundaerMuskeln).toEqual(['trizeps'])
  })

  it('lehnt leeren Namen und fehlende Primärmuskeln ab', () => {
    expect(
      erstelleEigeneUebung({ name: '  ', bewegungsTyp: 'push', primaerMuskeln: ['brust'] }, 1).ok,
    ).toBe(false)
    expect(
      erstelleEigeneUebung({ name: 'X', bewegungsTyp: 'push', primaerMuskeln: [] }, 1).ok,
    ).toBe(false)
  })
})

describe('vereinigeUebungen', () => {
  const uebung = (id: string, name: string): Exercise => ({
    id,
    name,
    maschine: name,
    primaerMuskeln: ['brust'],
    sekundaerMuskeln: [],
    bewegungsTyp: 'push',
    illustrationId: id,
  })

  it('ergänzt DB-Übungen und lässt DB-Stände gewinnen', () => {
    const seed = [uebung('a', 'A'), uebung('b', 'B')]
    const ausDb = [uebung('b', 'B (umbenannt)'), uebung('eigene_1', 'Meine')]
    const alle = vereinigeUebungen(seed, ausDb)
    expect(alle.map((u) => u.id).sort()).toEqual(['a', 'b', 'eigene_1'])
    expect(alle.find((u) => u.id === 'b')?.name).toBe('B (umbenannt)')
  })
})
