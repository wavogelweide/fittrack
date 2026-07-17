import { describe, expect, it } from 'vitest'
import type { WorkoutLog } from '../db/types'
import { rueckblickFaellig, wochenRueckblick } from './rueckblick'

// Heute: Donnerstag, 16.07.2026 → Vorwoche = Mo 06.07.–So 12.07.
const HEUTE = '2026-07-16'

const kraft = (id: number, datum: string, gewichtKg: number): WorkoutLog => ({
  id,
  datum,
  typ: 'kraft',
  eintraege: [{ art: 'kraft', exerciseId: 'brustpresse', saetze: [{ gewichtKg, wdh: 10 }] }],
})

describe('wochenRueckblick', () => {
  it('fasst die Vorwoche zusammen (Einheiten, Sätze, Volumen, Serie)', () => {
    const logs = [
      kraft(1, '2026-06-29', 40), // Vor-Vorwoche (für die Serie)
      kraft(2, '2026-07-06', 40),
      kraft(3, '2026-07-08', 42.5),
      kraft(4, '2026-07-14', 45), // aktuelle Woche → zählt nicht in den Rückblick
    ]
    const r = wochenRueckblick(logs, [], HEUTE)!
    expect(r.montag).toBe('2026-07-06')
    expect(r.einheiten).toBe(2)
    expect(r.saetze).toBe(2)
    expect(r.volumenKg).toBe(400 + 425)
    expect(r.serieWochen).toBe(3)
  })

  it('zählt Rekorde der Vorwoche gegen die Historie davor', () => {
    const logs = [
      kraft(1, '2026-06-29', 40), // Basis
      kraft(2, '2026-07-06', 45), // schwererer Satz + besseres 1RM → 2 Rekorde
    ]
    expect(wochenRueckblick(logs, [], HEUTE)!.rekorde).toBe(2)
  })

  it('liefert null, wenn in der Vorwoche nichts trainiert wurde', () => {
    expect(wochenRueckblick([], [], HEUTE)).toBeNull()
    expect(wochenRueckblick([kraft(1, '2026-07-14', 40)], [], HEUTE)).toBeNull()
  })
})

describe('rueckblickFaellig', () => {
  it('ist fällig, bis der Montag der aktuellen Woche quittiert wurde', () => {
    expect(rueckblickFaellig(undefined, HEUTE)).toBe(true)
    expect(rueckblickFaellig('2026-07-06', HEUTE)).toBe(true) // Vorwoche quittiert
    expect(rueckblickFaellig('2026-07-13', HEUTE)).toBe(false)
  })
})
