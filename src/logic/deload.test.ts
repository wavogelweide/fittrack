import { describe, expect, it } from 'vitest'
import type { WorkoutLog } from '../db/types'
import {
  DELOAD_NACH_WOCHEN,
  deloadEmpfehlung,
  deloadGewicht,
  deloadSaetze,
  trainingswochenSeitDeload,
} from './deload'

// Ein Kraft-Log am gegebenen Datum
function log(id: number, datum: string): WorkoutLog {
  return {
    id,
    datum,
    typ: 'kraft',
    eintraege: [{ art: 'kraft', exerciseId: 'brustpresse', saetze: [{ gewichtKg: 40, wdh: 10 }] }],
  }
}

// n aufeinanderfolgende Trainingswochen, endend in der Woche von heute
function serieLogs(n: number, heuteMontag: string): WorkoutLog[] {
  const logs: WorkoutLog[] = []
  const m = new Date(`${heuteMontag}T12:00:00`)
  for (let i = 0; i < n; i++) {
    logs.push(log(i + 1, m.toISOString().slice(0, 10)))
    m.setDate(m.getDate() - 7)
  }
  return logs
}

describe('trainingswochenSeitDeload', () => {
  it('zählt zusammenhängende Trainingswochen', () => {
    const logs = serieLogs(6, '2026-07-06')
    expect(trainingswochenSeitDeload(logs, '2026-07-11', undefined)).toBe(6)
  })

  it('stoppt an der letzten Deload-Woche', () => {
    const logs = serieLogs(6, '2026-07-06')
    // Deload lag vor 3 Wochen (Montag 2026-06-15) → nur 3 Wochen danach
    expect(trainingswochenSeitDeload(logs, '2026-07-11', '2026-06-15')).toBe(3)
  })

  it('eine leere aktuelle Woche bricht die Serie nicht', () => {
    const logs = serieLogs(4, '2026-06-29') // letzte Trainingswoche vergangene Woche
    expect(trainingswochenSeitDeload(logs, '2026-07-11', undefined)).toBe(4)
  })
})

describe('deloadEmpfehlung', () => {
  it('ist fällig ab 6 Trainingswochen in Folge', () => {
    const e = deloadEmpfehlung(serieLogs(DELOAD_NACH_WOCHEN, '2026-07-06'), '2026-07-11', undefined)
    expect(e.faellig).toBe(true)
    expect(e.trainingswochen).toBe(6)
    expect(e.grund).toContain('Deload')
  })

  it('ist bei weniger Wochen nicht fällig', () => {
    const e = deloadEmpfehlung(serieLogs(4, '2026-07-06'), '2026-07-11', undefined)
    expect(e.faellig).toBe(false)
    expect(e.grund).toBeNull()
  })

  it('markiert eine als Deload gesetzte aktuelle Woche als aktiv, nicht fällig', () => {
    const e = deloadEmpfehlung(serieLogs(8, '2026-07-06'), '2026-07-11', '2026-07-06')
    expect(e.aktiv).toBe(true)
    expect(e.faellig).toBe(false)
  })

  it('ist nach einem kürzlichen Deload wieder nicht fällig', () => {
    // 8 Trainingswochen, aber Deload vor 3 Wochen → Serie 3 < 6
    const e = deloadEmpfehlung(serieLogs(8, '2026-07-06'), '2026-07-11', '2026-06-15')
    expect(e.faellig).toBe(false)
    expect(e.trainingswochen).toBe(3)
  })
})

describe('deloadGewicht / deloadSaetze', () => {
  it('reduziert Gewicht auf ~90 % (auf 2,5 kg gerundet) und Sätze auf ~60 %', () => {
    expect(deloadGewicht(50)).toBe(45)
    expect(deloadGewicht(42.5)).toBe(37.5) // 38,25 → 37,5
    expect(deloadGewicht(null)).toBeNull()
    expect(deloadSaetze(3)).toBe(2)
    expect(deloadSaetze(4)).toBe(2)
    expect(deloadSaetze(2)).toBe(1)
  })
})
