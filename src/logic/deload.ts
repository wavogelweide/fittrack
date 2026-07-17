// Deload-Automatik: Nach mehreren Wochen durchgehenden Trainings ohne
// Entlastung empfiehlt die App eine Deload-Woche (reduziertes Volumen zur
// Regeneration) – ein Standardbaustein aus Online-Trainingsplänen, der auf die
// doppelte Progression folgt. Eine Deload-Woche senkt Sätze und Gewicht.
import type { WorkoutLog } from '../db/types'
import { rundeAufStufe } from './einRM'
import { montagDerWoche } from './statistik'

const MS_PRO_TAG = 24 * 60 * 60 * 1000

export const DELOAD_NACH_WOCHEN = 6 // ab so vielen Trainingswochen in Folge fällig
export const DELOAD_GEWICHT_FAKTOR = 0.9 // Intensität leicht zurück
export const DELOAD_SATZ_FAKTOR = 0.6 // Volumen deutlich zurück (−40 %)

const iso = (d: Date) => d.toISOString().slice(0, 10)

// Trainingswochen in Folge bis heute, gestoppt an der letzten Deload-Woche.
// Eine noch leere aktuelle Woche bricht die Zählung nicht ab.
export function trainingswochenSeitDeload(
  logs: WorkoutLog[],
  heute: string,
  deloadWoche: string | undefined,
): number {
  const trainiert = new Set(logs.map((l) => montagDerWoche(l.datum)))
  const montag = new Date(`${montagDerWoche(heute)}T12:00:00`)
  if (!trainiert.has(iso(montag))) montag.setTime(montag.getTime() - 7 * MS_PRO_TAG)
  let wochen = 0
  while (trainiert.has(iso(montag))) {
    if (deloadWoche && iso(montag) === deloadWoche) break // Deload beendet die Serie
    wochen += 1
    montag.setTime(montag.getTime() - 7 * MS_PRO_TAG)
  }
  return wochen
}

export interface DeloadEmpfehlung {
  faellig: boolean
  aktiv: boolean // aktuelle Woche ist als Deload markiert
  trainingswochen: number
  grund: string | null
}

export function deloadEmpfehlung(
  logs: WorkoutLog[],
  heute: string,
  deloadWoche: string | undefined,
): DeloadEmpfehlung {
  const wochen = trainingswochenSeitDeload(logs, heute, deloadWoche)
  const aktiv = deloadWoche === montagDerWoche(heute)
  const faellig = !aktiv && wochen >= DELOAD_NACH_WOCHEN
  return {
    faellig,
    aktiv,
    trainingswochen: wochen,
    grund: faellig
      ? `${wochen} Wochen durchtrainiert ohne Entlastung – eine Deload-Woche (−40 % Volumen, leichteres Gewicht) unterstützt die Regeneration.`
      : null,
  }
}

// Sätze/Gewicht einer Übung für die Deload-Woche abschwächen
export function deloadGewicht(gewichtKg: number | null): number | null {
  return gewichtKg === null ? null : rundeAufStufe(gewichtKg * DELOAD_GEWICHT_FAKTOR)
}

export function deloadSaetze(saetze: number): number {
  return Math.max(1, Math.round(saetze * DELOAD_SATZ_FAKTOR))
}

// 1RM-Retest-Empfehlung: die Woche direkt nach einer Deload-Woche ist der
// klassische Zeitpunkt, die Maximalgewichte neu zu testen – erholt, aber
// ohne Trainingsrückstand. Gilt nur für diese eine Woche und lässt sich
// je Deload-Woche einmal quittieren.
export function retestEmpfohlen(
  deloadWoche: string | undefined,
  heute: string,
  quittiert: string | undefined,
): boolean {
  if (!deloadWoche || quittiert === deloadWoche) return false
  const nachDeload = new Date(`${deloadWoche}T12:00:00`)
  nachDeload.setTime(nachDeload.getTime() + 7 * MS_PRO_TAG)
  return montagDerWoche(heute) === iso(nachDeload)
}
