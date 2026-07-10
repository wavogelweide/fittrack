import { describe, expect, it } from 'vitest'
import { ga1Zone, maxHerzfrequenz } from './puls'

describe('Pulszonen', () => {
  it('HFmax: erfasster Maximalpuls hat Vorrang vor der Schätzung', () => {
    expect(maxHerzfrequenz({ alter: 40, maxPuls: 190 })).toBe(190)
    expect(maxHerzfrequenz({ alter: 40 })).toBe(180)
    expect(maxHerzfrequenz({})).toBeNull()
  })

  it('GA1 ohne Ruhepuls: 60–75 % HFmax', () => {
    const z = ga1Zone({ alter: 40 })
    expect(z).toEqual({ von: 108, bis: 135, hfMax: 180 })
  })

  it('GA1 mit Ruhepuls: Karvonen-Formel', () => {
    const z = ga1Zone({ alter: 40, ruhePuls: 60 })
    // 60 + 0,6×(180−60) = 132; 60 + 0,75×120 = 150
    expect(z).toEqual({ von: 132, bis: 150, hfMax: 180 })
  })

  it('ohne Alter und Maximalpuls keine Zone', () => {
    expect(ga1Zone({ ruhePuls: 60 })).toBeNull()
  })
})
