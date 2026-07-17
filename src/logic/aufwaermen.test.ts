import { describe, expect, it } from 'vitest'
import { aufwaermSaetze } from './aufwaermen'

describe('aufwaermSaetze', () => {
  it('liefert 50 % × 10 und 75 % × 5, auf 2,5 kg gerundet', () => {
    expect(aufwaermSaetze(60)).toEqual([
      { gewichtKg: 30, wdh: 10 },
      { gewichtKg: 45, wdh: 5 },
    ])
    expect(aufwaermSaetze(42.5)).toEqual([
      { gewichtKg: 22.5, wdh: 10 }, // 21,25 → 22,5
      { gewichtKg: 32.5, wdh: 5 }, // 31,875 → 32,5
    ])
  })

  it('reduziert bei leichten Arbeitsgewichten auf einen Satz', () => {
    expect(aufwaermSaetze(25)).toEqual([{ gewichtKg: 12.5, wdh: 10 }])
  })

  it('lässt Aufwärmsätze bei sehr leichten Gewichten ganz weg', () => {
    expect(aufwaermSaetze(17.5)).toEqual([])
    expect(aufwaermSaetze(null)).toEqual([])
  })

  it('erzeugt nie einen Satz auf oder über dem Arbeitsgewicht', () => {
    for (const g of [20, 22.5, 30, 35, 100]) {
      for (const s of aufwaermSaetze(g)) expect(s.gewichtKg).toBeLessThan(g)
    }
  })
})
