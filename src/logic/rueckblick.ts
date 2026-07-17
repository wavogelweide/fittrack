// Wochenrückblick: beim ersten Öffnen in einer neuen Woche fasst eine Karte
// die vergangene Kalenderwoche zusammen (Einheiten, Volumen, Rekorde, Serie).
import type { MaxWeight, WorkoutLog } from '../db/types'
import { neueRekorde } from './rekorde'
import { aktuelleSerie, montagDerWoche } from './statistik'
import { fasseWorkoutZusammen } from './workout'

const MS_PRO_TAG = 24 * 60 * 60 * 1000

export interface WochenRueckblick {
  montag: string // Wochenbeginn der zusammengefassten Woche
  einheiten: number
  saetze: number
  volumenKg: number
  cardioMin: number
  rekorde: number
  serieWochen: number
}

// Zusammenfassung der Vorwoche – null, wenn dort nichts trainiert wurde
export function wochenRueckblick(
  logs: WorkoutLog[],
  maxWeights: MaxWeight[],
  heute: string,
): WochenRueckblick | null {
  const vorwoche = new Date(`${montagDerWoche(heute)}T12:00:00`)
  vorwoche.setTime(vorwoche.getTime() - 7 * MS_PRO_TAG)
  const montag = vorwoche.toISOString().slice(0, 10)

  const derWoche = logs
    .filter((l) => montagDerWoche(l.datum) === montag)
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.id - b.id)
  if (derWoche.length === 0) return null

  const r: WochenRueckblick = {
    montag,
    einheiten: derWoche.length,
    saetze: 0,
    volumenKg: 0,
    cardioMin: 0,
    rekorde: 0,
    serieWochen: aktuelleSerie(logs, heute),
  }
  for (const log of derWoche) {
    const z = fasseWorkoutZusammen(log)
    r.saetze += z.saetze
    r.volumenKg += z.volumenKg
    r.cardioMin += z.cardioMin
    // Rekorde je Einheit gegen alles davor (Namen sind für die Zählung egal)
    const davor = logs.filter(
      (l) => l.datum < log.datum || (l.datum === log.datum && l.id < log.id),
    )
    const maxDavor = maxWeights.filter((m) => m.datum < log.datum)
    r.rekorde += neueRekorde(log, davor, maxDavor, {}).length
  }
  return r
}

// Karte anzeigen, solange der Rückblick dieser Woche noch nicht gesehen wurde
export function rueckblickFaellig(gesehen: string | undefined, heute: string): boolean {
  return gesehen !== montagDerWoche(heute)
}
