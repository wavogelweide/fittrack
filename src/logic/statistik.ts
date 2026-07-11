// Trainingsstatistik: Wochenvolumen, Trainingsserie und Muskelgruppen-Verteilung
// aus dem Workout-Protokoll – Grundlage für das Dashboard im Analyse-Tab.
import type { BewegungsTyp, WorkoutLog } from '../db/types'
import { fasseWorkoutZusammen } from './workout'

const MS_PRO_TAG = 24 * 60 * 60 * 1000

// Montag der Kalenderwoche eines ISO-Datums (lokale Wochenlogik Mo–So)
export function montagDerWoche(datumIso: string): string {
  const d = new Date(`${datumIso}T12:00:00`)
  const tag = (d.getDay() + 6) % 7 // Mo = 0
  d.setDate(d.getDate() - tag)
  return d.toISOString().slice(0, 10)
}

export interface WochenEintrag {
  montag: string // ISO-Datum des Wochenbeginns
  label: string // z. B. "6.7."
  einheiten: number
  saetze: number
  volumenKg: number
  cardioMin: number
}

// Kennzahlen der letzten n Kalenderwochen (älteste zuerst, aktuelle Woche zuletzt)
export function wochenStatistik(logs: WorkoutLog[], heute: string, n = 8): WochenEintrag[] {
  const aktuellerMontag = montagDerWoche(heute)
  const wochen: WochenEintrag[] = []
  for (let i = n - 1; i >= 0; i--) {
    const montagDatum = new Date(`${aktuellerMontag}T12:00:00`)
    montagDatum.setDate(montagDatum.getDate() - i * 7)
    const montag = montagDatum.toISOString().slice(0, 10)
    wochen.push({
      montag,
      label: `${montagDatum.getDate()}.${montagDatum.getMonth() + 1}.`,
      einheiten: 0,
      saetze: 0,
      volumenKg: 0,
      cardioMin: 0,
    })
  }
  const proMontag = new Map(wochen.map((w) => [w.montag, w]))
  for (const log of logs) {
    const woche = proMontag.get(montagDerWoche(log.datum))
    if (!woche) continue
    const z = fasseWorkoutZusammen(log)
    woche.einheiten += 1
    woche.saetze += z.saetze
    woche.volumenKg += z.volumenKg
    woche.cardioMin += z.cardioMin
  }
  return wochen
}

// Trainingsserie: Kalenderwochen in Folge mit mindestens einer Einheit.
// Die laufende Woche zählt mit, sobald sie eine Einheit hat – eine noch
// leere aktuelle Woche bricht die Serie aber nicht ab.
export function aktuelleSerie(logs: WorkoutLog[], heute: string): number {
  const trainierteWochen = new Set(logs.map((l) => montagDerWoche(l.datum)))
  let serie = 0
  const montag = new Date(`${montagDerWoche(heute)}T12:00:00`)
  if (!trainierteWochen.has(montag.toISOString().slice(0, 10))) {
    montag.setTime(montag.getTime() - 7 * MS_PRO_TAG) // aktuelle Woche noch offen
  }
  while (trainierteWochen.has(montag.toISOString().slice(0, 10))) {
    serie += 1
    montag.setTime(montag.getTime() - 7 * MS_PRO_TAG)
  }
  return serie
}

// Sätze je Bewegungstyp seit einem Stichtag (z. B. letzte 4 Wochen) –
// zeigt, ob Zug/Druck/Beine/Rumpf im Gleichgewicht trainiert werden
export function saetzeNachBewegungsTyp(
  logs: WorkoutLog[],
  bewegungsTypVon: Record<string, BewegungsTyp>,
  abDatum: string,
): Record<BewegungsTyp, number> {
  const ergebnis: Record<BewegungsTyp, number> = {
    push: 0,
    pull: 0,
    legs_front: 0,
    legs_back: 0,
    core: 0,
  }
  for (const log of logs) {
    if (log.datum < abDatum) continue
    for (const e of log.eintraege) {
      if (e.art !== 'kraft') continue
      const typ = bewegungsTypVon[e.exerciseId]
      if (typ) ergebnis[typ] += e.saetze.length
    }
  }
  return ergebnis
}

// Stichtag "vor n Wochen" relativ zu heute
export function vorWochen(heute: string, n: number): string {
  const d = new Date(`${heute}T12:00:00`)
  d.setDate(d.getDate() - n * 7)
  return d.toISOString().slice(0, 10)
}
