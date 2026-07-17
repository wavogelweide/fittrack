import { describe, expect, it } from 'vitest'
import type { WorkoutLog } from '../db/types'
import { monatsGitter, monatsName, typenProTag, verschiebeMonat } from './kalender'

describe('monatsGitter', () => {
  it('beginnt am Montag vor dem 1. und endet am Sonntag nach dem Monatsende', () => {
    // Juli 2026: der 1. ist ein Mittwoch, der 31. ein Freitag
    const wochen = monatsGitter(2026, 7)
    expect(wochen[0][0].datum).toBe('2026-06-29') // Montag davor
    expect(wochen[0][0].imMonat).toBe(false)
    expect(wochen[0][2]).toMatchObject({ datum: '2026-07-01', tag: 1, imMonat: true })
    const letzteWoche = wochen[wochen.length - 1]
    expect(letzteWoche[6].datum).toBe('2026-08-02') // Sonntag danach
    expect(wochen.every((w) => w.length === 7)).toBe(true)
  })

  it('kommt mit einem Monat aus, der am Montag beginnt', () => {
    // Juni 2026 beginnt am Montag
    const wochen = monatsGitter(2026, 6)
    expect(wochen[0][0]).toMatchObject({ datum: '2026-06-01', imMonat: true })
    expect(wochen).toHaveLength(5)
  })
})

describe('monatsName', () => {
  it('formatiert deutsch', () => {
    expect(monatsName(2026, 7)).toBe('Juli 2026')
  })
})

describe('verschiebeMonat', () => {
  it('wechselt über Jahresgrenzen', () => {
    expect(verschiebeMonat(2026, 1, -1)).toEqual({ jahr: 2025, monat: 12 })
    expect(verschiebeMonat(2026, 12, 1)).toEqual({ jahr: 2027, monat: 1 })
    expect(verschiebeMonat(2026, 7, 1)).toEqual({ jahr: 2026, monat: 8 })
  })
})

describe('typenProTag', () => {
  it('dedupliziert Typen je Tag in fester Reihenfolge', () => {
    const logs: WorkoutLog[] = [
      { id: 1, datum: '2026-07-06', typ: 'cardio', eintraege: [] },
      { id: 2, datum: '2026-07-06', typ: 'kraft', eintraege: [] },
      { id: 3, datum: '2026-07-06', typ: 'kraft', eintraege: [] },
      { id: 4, datum: '2026-07-08', typ: 'dehnen', eintraege: [] },
    ]
    expect(typenProTag(logs)).toEqual({
      '2026-07-06': ['kraft', 'cardio'],
      '2026-07-08': ['dehnen'],
    })
  })
})
