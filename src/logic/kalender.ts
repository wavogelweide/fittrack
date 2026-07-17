// Kalenderansicht der Historie: Monatsraster (Wochen Mo–So) mit den
// Trainingstypen je Tag, farbcodiert im Historie-Tab.
import type { WorkoutLog } from '../db/types'

export interface KalenderZelle {
  datum: string // ISO-Datum
  tag: number // Tag im Monat (1–31)
  imMonat: boolean // false = Auffüll-Tag des Vor-/Folgemonats
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

// Monatsraster als Wochen (Mo–So), aufgefüllt mit Nachbarmonats-Tagen
export function monatsGitter(jahr: number, monat: number): KalenderZelle[][] {
  const erster = new Date(Date.UTC(jahr, monat - 1, 1, 12))
  const start = new Date(erster)
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7)) // zurück zum Montag

  const wochen: KalenderZelle[][] = []
  const cursor = new Date(start)
  do {
    const woche: KalenderZelle[] = []
    for (let i = 0; i < 7; i++) {
      woche.push({
        datum: iso(cursor),
        tag: cursor.getUTCDate(),
        imMonat: cursor.getUTCMonth() === monat - 1,
      })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    wochen.push(woche)
  } while (cursor.getUTCMonth() === monat - 1)
  return wochen
}

export function monatsName(jahr: number, monat: number): string {
  return new Date(Date.UTC(jahr, monat - 1, 1, 12)).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  })
}

export function verschiebeMonat(
  jahr: number,
  monat: number,
  delta: number,
): { jahr: number; monat: number } {
  const gesamt = jahr * 12 + (monat - 1) + delta
  return { jahr: Math.floor(gesamt / 12), monat: (((gesamt % 12) + 12) % 12) + 1 }
}

// Trainingstypen je Datum (dedupliziert, feste Reihenfolge Kraft/Cardio/Dehnen)
const TYP_REIHENFOLGE: WorkoutLog['typ'][] = ['kraft', 'cardio', 'dehnen']

export function typenProTag(logs: WorkoutLog[]): Record<string, WorkoutLog['typ'][]> {
  const proTag: Record<string, Set<WorkoutLog['typ']>> = {}
  for (const log of logs) (proTag[log.datum] ??= new Set()).add(log.typ)
  return Object.fromEntries(
    Object.entries(proTag).map(([datum, typen]) => [
      datum,
      TYP_REIHENFOLGE.filter((t) => typen.has(t)),
    ]),
  )
}
